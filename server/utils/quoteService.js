import crypto from 'node:crypto';
import { calculateQuote } from './quoteCalc.js';
import { formatCustomerSafeQuote } from './mobileQuoteFormatter.js';
import { notifyNewQuote } from '../../api/_lib/discordHelper.js';
import {
  DEFAULT_QUOTE_MESSAGE_TEMPLATES,
  dispatchMessage,
  getMessagingChannelStatus,
  renderQuoteMessageTemplate,
} from './messagingService.js';

export function checkConvexPartnerAccess(partnerOrgId, user, project, organizations = []) {
  if (!partnerOrgId) return true;
  if (project.orgId && Number(project.orgId) === Number(partnerOrgId)) return true;

  const myOrg = organizations.find((o) => Number(o.orgId) === Number(partnerOrgId));
  const allowedNames = new Set(
    organizations
      .filter((o) => Number(o.parentId) === Number(partnerOrgId))
      .map((o) => o.name)
  );
  if (myOrg) allowedNames.add(myOrg.name);
  if (user?.org_name) allowedNames.add(user.org_name);

  return allowedNames.has(project.partnerName);
}

export const QUOTE_VARIANT_DEFS = {
  villaz: { key: 'villaz', label: '빌라즈 견적', subLabel: '프리미엄 창호' },
  value: { key: 'value', label: '가성비 견적', subLabel: '합리적인 창호' },
};

function normalizeSingleVariantCalc(rawVar, fallbackTitle = '') {
  if (!rawVar || typeof rawVar !== 'object') return null;
  const vKey = rawVar.key === 'value' ? 'value' : 'villaz';
  const def = QUOTE_VARIANT_DEFS[vKey];
  const rawItems = Array.isArray(rawVar.items) ? rawVar.items : [];
  if (!rawItems.length) return null;

  const mRate = Number(rawVar.marginRate ?? 100);
  const mScope = rawVar.marginScope === 'all' ? 'all' : 'material';
  const sDiscount = Math.max(0, Math.round(Number(rawVar.discountAmount) || 0));
  const pMeta = rawVar.meta && typeof rawVar.meta === 'object' ? rawVar.meta : null;
  const rSupply = Math.max(0, Math.round(Number(rawVar.supplyCost || pMeta?.excel_grand_total || 0) || 0));
  const rExcelSub = Math.max(0, Math.round(Number(rawVar.excelSubtotal || pMeta?.excel_subtotal || 0) || 0));

  const calc = calculateQuote(rawItems, {
    defaultMarginRate: mRate,
    discountAmount: sDiscount,
    supplyCost: rSupply,
    excelSubtotal: rExcelSub,
  });

  // Strip nested quote_variants from per-variant meta to avoid recursion
  let cleanMeta = null;
  if (pMeta) {
    const { quote_variants: _qv, editor_state: _es, ...restMeta } = pMeta;
    cleanMeta = restMeta;
  }

  return {
    key: vKey,
    label: String(rawVar.label || def.label),
    subLabel: String(rawVar.subLabel || def.subLabel),
    title: String(rawVar.title || fallbackTitle || `${def.label} (${def.subLabel})`),
    sourceFileName: rawVar.sourceFileName ? String(rawVar.sourceFileName) : '',
    marginScope: mScope,
    marginRate: calc.margin_rate,
    discountAmount: calc.discount_amount,
    supplyCost: calc.supply_cost,
    totalCost: calc.total_cost,
    materialSubtotal: calc.material_subtotal,
    extraSubtotal: calc.extra_subtotal,
    salePrice: calc.sale_price,
    vat: calc.vat,
    originalPrice: calc.original_price,
    totalPrice: calc.total_price,
    marginAmount: calc.margin_amount,
    meta: cleanMeta,
    items: calc.items.map((it) => ({
      sort_order: it.sort_order,
      name: String(it.name || ''),
      spec: it.spec ? String(it.spec) : '',
      category: it.category || 'window',
      detail_json: it.detail_json || null,
      quantity: Number(it.quantity) || 1,
      margin_rate: Number(it.margin_rate ?? 100),
      cost_unit_price: Number(it.cost_unit_price) || 0,
      cost_total: Number(it.cost_total) || 0,
      sale_unit_price: Number(it.sale_unit_price) || 0,
      sale_total: Number(it.sale_total) || 0,
    })),
    _calculated: calc,
  };
}

export async function createQuoteInConvex(convexClient, api, { body, user, partnerOrgId }) {
  const {
    projectId,
    title,
    quoteType = '가견적',
    items,
    marginRate = 100.0,
    marginScope = 'material',
    discountAmount = 0,
    supplyCost = 0,
    excelSubtotal = 0,
    sourceFileName = '',
    meta = null,
    memo,
    isPublish = true,
    variants: incomingVariants = null,
  } = body || {};

  // Build normalized variants if provided (1 or 2 tabs: villaz / value)
  const validVariants = [];
  if (Array.isArray(incomingVariants) && incomingVariants.length > 0) {
    for (const vKey of ['villaz', 'value']) {
      const found = incomingVariants.find((v) => v && v.key === vKey);
      const norm = normalizeSingleVariantCalc(found, title);
      if (norm) validVariants.push(norm);
    }
  }

  const hasDirectItems = Array.isArray(items) && items.length > 0;
  if (!projectId || (!hasDirectItems && validVariants.length === 0)) {
    return { status: 400, data: { error: '공사건 ID와 최소 1개 이상의 견적(빌라즈 또는 가성비) 품목이 필요합니다.' } };
  }

  const pId = parseInt(projectId, 10);
  if (Number.isNaN(pId)) {
    return { status: 400, data: { error: '유효하지 않은 공사건 ID입니다.' } };
  }

  if (partnerOrgId) {
    const preview = await convexClient.query(api.quotes.getPreviewByProject, { projectId: pId });
    if (!preview?.project) {
      return { status: 404, data: { error: '공사건을 찾을 수 없습니다.' } };
    }
    if (!checkConvexPartnerAccess(partnerOrgId, user, preview.project, preview.organizations)) {
      return { status: 403, data: { error: '접근 권한이 없습니다.' } };
    }
  }

  // Primary quote calculation: use first populated variant (villaz preferred, else value), or fallback to direct body fields
  let calculated;
  let primarySourceFile = sourceFileName ? String(sourceFileName) : '';
  let primaryMarginScope = marginScope === 'all' ? 'all' : 'material';
  let primaryMarginRate = Number(marginRate ?? 100);
  let safeDiscount = Math.max(0, Math.round(Number(discountAmount) || 0));
  let parsedMeta = meta && typeof meta === 'object' ? meta : null;

  if (validVariants.length > 0) {
    const primaryVar = validVariants[0];
    calculated = primaryVar._calculated;
    primarySourceFile = primaryVar.sourceFileName;
    primaryMarginScope = primaryVar.marginScope;
    primaryMarginRate = primaryVar.marginRate;
    safeDiscount = primaryVar.discountAmount;
    parsedMeta = primaryVar.meta || parsedMeta;
  } else {
    const resolvedSupplyCost = Math.max(0, Math.round(Number(supplyCost || parsedMeta?.excel_grand_total || 0) || 0));
    const resolvedExcelSub = Math.max(0, Math.round(Number(excelSubtotal || parsedMeta?.excel_subtotal || 0) || 0));
    calculated = calculateQuote(items, {
      defaultMarginRate: marginRate,
      discountAmount: safeDiscount,
      supplyCost: resolvedSupplyCost,
      excelSubtotal: resolvedExcelSub,
    });
  }

  const safeType = ['가견적', '최종견적', '비교안'].includes(quoteType) ? quoteType : '가견적';
  const status = isPublish ? 'published' : 'draft';
  const accessToken = `tok_${pId}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;

  const storedVariants = validVariants.map(({ _calculated, ...rest }) => rest);
  const { quote_variants: _oldQv, ...cleanTopMeta } = parsedMeta || {};

  const enrichedMeta = {
    ...cleanTopMeta,
    editor_state: {
      marginScope: primaryMarginScope,
      marginRate: primaryMarginRate,
      discountAmount: safeDiscount,
      supplyCost: calculated.supply_cost,
      excelSubtotal: calculated.total_cost,
      sourceFileName: primarySourceFile || (parsedMeta?.editor_state?.sourceFileName || ''),
      savedAt: new Date().toISOString(),
    },
    ...(storedVariants.length > 0 ? { quote_variants: storedVariants } : {}),
  };
  const metaJsonStr = JSON.stringify(enrichedMeta);

  const convexItems = calculated.items.map((item) => ({
    sortOrder: item.sort_order,
    name: String(item.name || ''),
    spec: item.spec ? String(item.spec) : undefined,
    category: item.category || 'window',
    detailJson: item.detail_json || undefined,
    quantity: Number(item.quantity) || 1,
    marginRate: Number(item.margin_rate ?? 100),
    costUnitPrice: Number(item.cost_unit_price) || 0,
    costTotal: Number(item.cost_total) || 0,
    saleUnitPrice: Number(item.sale_unit_price) || 0,
    saleTotal: Number(item.sale_total) || 0,
  }));

  const result = await convexClient.mutation(api.quotes.createProjectQuote, {
    projectId: pId,
    title: title ? String(title) : undefined,
    quoteType: safeType,
    status,
    totalCost: calculated.total_cost,
    supplyCost: calculated.supply_cost,
    marginRate: calculated.margin_rate,
    materialSubtotal: calculated.material_subtotal,
    extraSubtotal: calculated.extra_subtotal,
    salePrice: calculated.sale_price,
    vat: calculated.vat,
    originalPrice: calculated.original_price,
    totalPrice: calculated.total_price,
    discountAmount: calculated.discount_amount,
    marginAmount: calculated.margin_amount,
    metaJson: metaJsonStr,
    memo: memo ? String(memo) : '',
    accessToken,
    isPublish: Boolean(isPublish),
    userName: user?.name || '관리자',
    items: convexItems,
  });

  if (!result?.found) {
    return { status: 404, data: { error: '공사건을 찾을 수 없습니다.' } };
  }

  try {
    const detail = await convexClient.query(api.crm.getCustomerDetail, { projectId: pId }).catch(() => null);
    const proj = detail?.project || null;
    const variantSummaryTitle =
      storedVariants.length > 1
        ? `${result.title || title || safeType} (${storedVariants.map((v) => `${v.label} ${Math.round(v.totalPrice).toLocaleString('ko-KR')}원`).join(' / ')})`
        : storedVariants.length === 1
          ? `[${storedVariants[0].label}] ${result.title || title || `${safeType} v${result.version}`}`
          : result.title || title || `${safeType} v${result.version}`;
    await notifyNewQuote({
      projectId: pId,
      customerName: proj?.customerName,
      phone: proj?.customerPhone,
      version: result.version,
      title: variantSummaryTitle,
      quoteType: result.quoteType || safeType,
      status,
      totalPrice: calculated.total_price,
      partnerName: result.partnerName || proj?.partnerName || '직영',
      userName: user?.name || '관리자',
    });
  } catch {}

  return {
    status: 201,
    data: {
      quote_id: result.version,
      version: result.version,
      quote_type: result.quoteType,
      access_token: result.accessToken,
      public_url: result.publicUrl,
      summary: {
        total_cost: calculated.total_cost,
        supply_cost: calculated.supply_cost,
        margin_rate: calculated.margin_rate,
        material_subtotal: calculated.material_subtotal,
        extra_subtotal: calculated.extra_subtotal,
        sale_price: calculated.sale_price,
        vat: calculated.vat,
        original_price: calculated.original_price,
        discount_amount: calculated.discount_amount,
        total_price: calculated.total_price,
        margin_amount: calculated.margin_amount,
      },
    },
  };
}

export function mapConvexQuoteForFormatter(quote, project, managerPhone = '', orgPhone = '') {
  return {
    id: quote.version,
    project_id: project.projectId,
    version: quote.version,
    title: quote.title,
    quote_type: quote.quoteType || '가견적',
    status: quote.status,
    material_subtotal: quote.materialSubtotal,
    extra_subtotal: quote.extraSubtotal,
    sale_price: quote.salePrice,
    vat: quote.vat,
    original_price: quote.originalPrice,
    total_price: quote.totalPrice,
    discount_amount: quote.discountAmount || 0,
    meta_json: quote.metaJson || null,
    access_token: quote.accessToken || '',
    published_at: quote.publishedAt || quote.createdAt,
    customer_name: project.customerName,
    customer_phone: project.customerPhone,
    customer_address: project.customerAddress,
    product: project.product || '창호',
    drawing_url: project.drawingUrl || '',
    owner_name: project.ownerName || '',
    partner_name: project.partnerName || '',
    manager_phone: managerPhone,
    org_phone: orgPhone,
  };
}

export function mapConvexItemsForFormatter(items = []) {
  return [...items]
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((it) => ({
      sort_order: it.sortOrder,
      name: it.name,
      spec: it.spec || '',
      category: it.category || 'window',
      detail_json: it.detailJson || null,
      quantity: it.quantity,
      sale_unit_price: it.saleUnitPrice,
      sale_total: it.saleTotal,
    }));
}

export async function getProjectQuotePreviewFromConvex(
  convexClient,
  api,
  { projectId, requestedType = '', requestedQuoteId = null, allowSimulate = true, partnerOrgId = null, user = null, messagingLive = false, messagingStatus = null }
) {
  const data = await convexClient.query(api.quotes.getPreviewByProject, { projectId });
  if (!data || !data.project) {
    return { status: 404, data: { error: '해당 고객에게 발행된 견적서가 없습니다. 먼저 견적을 발행해 주세요.' } };
  }

  if (!checkConvexPartnerAccess(partnerOrgId, user, data.project, data.organizations)) {
    return { status: 403, data: { error: '접근 권한이 없습니다.' } };
  }

  const canEditQuote = !partnerOrgId && Boolean(user) && user.role !== 'partner';
  const publishedQuotes = data.quotes || [];
  const editorCandidateQuotes = canEditQuote && Array.isArray(data.allQuotes) && data.allQuotes.length
    ? data.allQuotes
    : publishedQuotes;
  const allQuotes = publishedQuotes.length ? publishedQuotes : editorCandidateQuotes;
  if (!allQuotes.length) {
    return { status: 404, data: { error: '해당 고객에게 발행된 견적서가 없습니다. 먼저 견적을 발행해 주세요.' } };
  }

  let quote = allQuotes[0];
  let isSimulatedType = false;

  if (requestedQuoteId) {
    const byId = editorCandidateQuotes.find((q) => Number(q.version) === Number(requestedQuoteId));
    if (byId) quote = byId;
  } else if (requestedType) {
    const byType = allQuotes.find((q) => (q.quoteType || '가견적') === requestedType)
      || (canEditQuote ? editorCandidateQuotes.find((q) => (q.quoteType || '가견적') === requestedType) : null);
    if (byType) {
      quote = byType;
    } else {
      isSimulatedType = true;
    }
  }

  const rawItems = mapConvexItemsForFormatter(
    (data.quoteItems || []).filter((it) => Number(it.quoteVersion) === Number(quote.version))
  );

  const mappedQuote = mapConvexQuoteForFormatter(quote, data.project, data.managerPhone, data.orgPhone);
  const safeQuote = formatCustomerSafeQuote(mappedQuote, rawItems);
  if (isSimulatedType && allowSimulate && requestedType) {
    safeQuote.quote_type = requestedType;
    safeQuote.is_simulated_type = true;
  }

  const availableQuotes = allQuotes.map((q) => ({
    id: q.version,
    version: q.version,
    title: q.title,
    quote_type: q.quoteType || '가견적',
    total_price: q.totalPrice,
    discount_amount: q.discountAmount || 0,
    access_token: q.accessToken || '',
    public_url: q.accessToken ? `/quote.html?token=${q.accessToken}` : '',
    published_at: String(q.publishedAt || q.createdAt || '').slice(0, 10),
  }));

  const roughQuoteMeta = availableQuotes.find((q) => q.quote_type === '가견적') || null;
  const finalQuoteMeta = availableQuotes.find((q) => q.quote_type === '최종견적') || null;
  const viewsCount = (data.views || []).filter(
    (v) => v.accessToken === quote.accessToken || Number(v.quoteId) === Number(quote.version)
  ).length;

  const dispatches = (data.dispatches || []).map((d, idx) => ({
    id: idx + 1,
    quote_id: d.quoteId,
    channel: d.channel,
    recipient_name: d.recipientName,
    recipient_phone: d.recipientPhone,
    message: d.message,
    quote_url: d.quoteUrl,
    provider: d.provider,
    status: d.status,
    sent_by: d.sentBy,
    sent_at: d.createdAt ? String(d.createdAt).slice(0, 16).replace('T', ' ') : '',
  }));

  let adminEditorQuote = null;
  if (canEditQuote && quote) {
    let parsedMeta = null;
    if (quote.metaJson) {
      try { parsedMeta = JSON.parse(quote.metaJson); } catch {}
    }
    const quoteItemsForVersion = (data.quoteItems || [])
      .filter((it) => Number(it.quoteVersion) === Number(quote.version))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((it) => {
        let parsedDetail = null;
        if (it.detailJson) {
          try { parsedDetail = JSON.parse(it.detailJson); } catch {}
        }
        return {
          name: it.name || '',
          spec: it.spec || '',
          category: it.category || 'window',
          detail: parsedDetail,
          qty: Number(it.quantity) || 1,
          price: Number(it.costUnitPrice) || 0,
          cost_total: Number(it.costTotal) || 0,
          margin_rate:
            it.marginRate !== undefined && it.marginRate !== null
              ? Number(it.marginRate)
              : Number(quote.marginRate ?? 100),
          sale_unit_price: Number(it.saleUnitPrice) || 0,
          sale_total: Number(it.saleTotal) || 0,
        };
      });

    adminEditorQuote = {
      id: quote.version,
      version: quote.version,
      status: quote.status || 'published',
      quote_type: quote.quoteType || '가견적',
      title: quote.title || '',
      memo: quote.memo || '',
      margin_rate:
        quote.marginRate !== undefined && quote.marginRate !== null
          ? Number(quote.marginRate)
          : 100,
      margin_scope: parsedMeta?.editor_state?.marginScope || null,
      source_file: parsedMeta?.editor_state?.sourceFileName || '',
      discount_amount: Number(quote.discountAmount) || 0,
      supply_cost: Number(quote.supplyCost) || 0,
      total_cost: Number(quote.totalCost) || 0,
      margin_amount: Number(quote.marginAmount) || 0,
      meta: parsedMeta,
      variants: Array.isArray(parsedMeta?.quote_variants)
        ? parsedMeta.quote_variants.map((v) => ({
            ...v,
            items: (v.items || []).map((it) => {
              let parsedDetail = null;
              if (it.detail_json) {
                try { parsedDetail = typeof it.detail_json === 'string' ? JSON.parse(it.detail_json) : it.detail_json; } catch {}
              } else if (it.detail && typeof it.detail === 'object') {
                parsedDetail = it.detail;
              }
              return {
                name: it.name || '',
                spec: it.spec || '',
                category: it.category || 'window',
                detail: parsedDetail,
                qty: Number(it.quantity ?? it.qty) || 1,
                price: Number(it.cost_unit_price ?? it.price) || 0,
                cost_total: Number(it.cost_total) || 0,
                margin_rate: it.margin_rate !== undefined && it.margin_rate !== null ? Number(it.margin_rate) : Number(v.marginRate ?? 100),
                sale_unit_price: Number(it.sale_unit_price) || 0,
                sale_total: Number(it.sale_total) || 0,
              };
            }),
          }))
        : null,
      items: quoteItemsForVersion,
    };
  }

  return {
    status: 200,
    data: {
      quote: safeQuote,
      ...(adminEditorQuote ? { admin_editor_quote: adminEditorQuote } : {}),
      is_simulated_type: isSimulatedType,
      requested_type: requestedType || safeQuote.quote_type,
      available_quotes: availableQuotes,
      rough_quote: roughQuoteMeta,
      final_quote: finalQuoteMeta,
      rough_quote_url: data.project.roughQuoteUrl || (roughQuoteMeta ? roughQuoteMeta.public_url : ''),
      final_quote_url: data.project.finalQuoteUrl || (finalQuoteMeta ? finalQuoteMeta.public_url : ''),
      access_token: quote.accessToken || '',
      public_url: quote.accessToken ? `/quote.html?token=${quote.accessToken}` : '',
      customer_phone_raw: data.project.customerPhone || '',
      views_count: viewsCount,
      dispatches,
      messaging_live: Boolean(messagingLive),
      messaging_status: messagingStatus || {
        live: Boolean(messagingLive),
        smsReady: Boolean(messagingLive),
        kakaoReady: Boolean(messagingLive),
        provider: messagingLive ? 'webhook' : 'simulation',
      },
    },
  };
}

export async function sendProjectQuoteViaConvex(
  convexClient,
  api,
  { projectId, body, user, partnerOrgId, baseOrigin, msgCfg = {} }
) {
  const { channel = 'kakao', recipientPhone, recipientName, message, origin, quoteType, quoteId, tplKey = '' } = body || {};

  if (!['sms', 'kakao'].includes(channel)) {
    return { status: 400, data: { error: '발송 채널은 문자(sms) 또는 카카오톡(kakao)이어야 합니다.' } };
  }

  const data = await convexClient.query(api.quotes.getPreviewByProject, { projectId });
  if (!data || !data.project) {
    return { status: 404, data: { error: '발송할 발행 견적서가 없습니다. 먼저 견적서를 발행해 주세요.' } };
  }

  if (!checkConvexPartnerAccess(partnerOrgId, user, data.project, data.organizations)) {
    return { status: 403, data: { error: '접근 권한이 없습니다.' } };
  }

  const allQuotes = data.quotes || [];
  let quote = allQuotes[0] || null;
  if (quoteId) {
    const byId = allQuotes.find((q) => Number(q.version) === Number(quoteId));
    if (byId) quote = byId;
  } else if (quoteType) {
    const byType = allQuotes.find((q) => (q.quoteType || '가견적') === quoteType);
    if (byType) quote = byType;
  }

  if (!quote) {
    return { status: 404, data: { error: '발송할 발행 견적서가 없습니다. 먼저 견적서를 발행해 주세요.' } };
  }

  const targetPhone = String(recipientPhone || data.project.customerPhone || '').trim();
  const cleanDigits = targetPhone.replace(/\D/g, '');
  if (cleanDigits.length < 10 || cleanDigits.length > 11) {
    return { status: 400, data: { error: '올바른 수신 휴대폰 번호를 입력해 주세요.' } };
  }

  const targetName = String(recipientName || data.project.customerName || '고객').trim();
  const resolvedOrigin = origin || baseOrigin;
  const quoteUrl = `${resolvedOrigin}/quote.html`;
  const safeQuoteType = quote.quoteType || '가견적';
  const isFinalQuote = safeQuoteType === '최종견적';
  const rawTemplate = isFinalQuote
    ? (msgCfg?.msgTemplateFinal || DEFAULT_QUOTE_MESSAGE_TEMPLATES.final)
    : (msgCfg?.msgTemplateBasic || DEFAULT_QUOTE_MESSAGE_TEMPLATES.basic);
  const defaultMsg = renderQuoteMessageTemplate(rawTemplate, {
    customerName: targetName,
    quoteType: safeQuoteType,
    totalPrice: Number(quote.totalPrice || 0),
    quoteUrl,
    product: data.project.product || '창호',
  });
  const finalMessage = String(message || defaultMsg).trim();

  const dispatchResult = await dispatchMessage(
    msgCfg,
    {
      channel,
      to: cleanDigits,
      recipientName: targetName,
      message: finalMessage,
      quoteUrl,
      projectId,
      quoteId: quote.version,
      quoteType: safeQuoteType,
      product: data.project.product || '창호',
      totalPrice: Number(quote.totalPrice || 0),
      tplKey: tplKey || (safeQuoteType === '최종견적' ? 'final' : 'basic'),
      sentBy: user?.name || '관리자',
    },
    { convexClient, api }
  );

  if (!dispatchResult.ok && dispatchResult.status === 400) {
    return {
      status: 400,
      data: {
        error: dispatchResult.error,
        provider: dispatchResult.provider,
      },
    };
  }

  const providerUsed = dispatchResult.provider || 'simulation';
  const sendStatus = dispatchResult.ok ? 'sent' : 'failed';
  const externalResponse = dispatchResult.ok ? dispatchResult.detail || 'delivered' : dispatchResult.error || 'send_failed';

  await convexClient.mutation(api.quotes.recordQuoteDispatch, {
    projectId,
    quoteVersion: quote.version,
    channel,
    recipientName: targetName,
    recipientPhone: targetPhone,
    message: finalMessage,
    quoteUrl,
    provider: providerUsed,
    status: sendStatus,
    sentBy: user?.name || '관리자',
  });

  if (sendStatus === 'failed') {
    return {
      status: 502,
      data: {
        error: `외부 발송 연동 오류가 발생했습니다. (${externalResponse})`,
        provider: providerUsed,
      },
    };
  }

  const providerLabel =
    providerUsed === 'barobill'
      ? '바로빌'
      : providerUsed === 'aligo'
        ? '알리고'
        : '외부 API';

  return {
    status: 200,
    data: {
      success: true,
      channel,
      quote_type: safeQuoteType,
      quote_version: quote.version,
      provider: providerUsed,
      simulated: providerUsed === 'simulation',
      recipient_name: targetName,
      recipient_phone: targetPhone,
      quote_url: quoteUrl,
      messaging_status: getMessagingChannelStatus(msgCfg),
      message:
        providerUsed === 'simulation'
          ? `${channel === 'kakao' ? '카카오 알림톡' : '문자'} 발송이 시뮬레이션 모드로 기록되었습니다. (실제 발송은 설정 → 외부 연동에서 발송 API를 활성화하세요)`
          : `${targetName} 고객님께 ${channel === 'kakao' ? '카카오 알림톡' : '문자'}을 실제 발송했습니다. (${providerLabel})`,
    },
  };
}
