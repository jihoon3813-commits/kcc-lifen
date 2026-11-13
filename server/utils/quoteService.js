import crypto from 'node:crypto';
import { calculateQuote } from './quoteCalc.js';
import { formatCustomerSafeQuote } from './mobileQuoteFormatter.js';

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

export async function createQuoteInConvex(convexClient, api, { body, user, partnerOrgId }) {
  const {
    projectId,
    title,
    quoteType = '가견적',
    items,
    marginRate = 100.0,
    discountAmount = 0,
    supplyCost = 0,
    excelSubtotal = 0,
    meta = null,
    memo,
    isPublish = true,
  } = body || {};

  if (!projectId || !items || !Array.isArray(items) || items.length === 0) {
    return { status: 400, data: { error: '공사건 ID와 견적 품목 목록이 필요합니다.' } };
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

  const safeDiscount = Math.max(0, Math.round(Number(discountAmount) || 0));
  const parsedMeta = meta && typeof meta === 'object' ? meta : null;
  const resolvedSupplyCost = Math.max(0, Math.round(Number(supplyCost || parsedMeta?.excel_grand_total || 0) || 0));
  const resolvedExcelSub = Math.max(0, Math.round(Number(excelSubtotal || parsedMeta?.excel_subtotal || 0) || 0));

  const calculated = calculateQuote(items, {
    defaultMarginRate: marginRate,
    discountAmount: safeDiscount,
    supplyCost: resolvedSupplyCost,
    excelSubtotal: resolvedExcelSub,
  });

  const safeType = ['가견적', '최종견적', '비교안'].includes(quoteType) ? quoteType : '가견적';
  const status = isPublish ? 'published' : 'draft';
  const accessToken = `tok_${pId}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
  const metaJsonStr = parsedMeta ? JSON.stringify(parsedMeta) : undefined;

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
  { projectId, requestedType = '', requestedQuoteId = null, allowSimulate = true, partnerOrgId = null, user = null, messagingLive = false }
) {
  const data = await convexClient.query(api.quotes.getPreviewByProject, { projectId });
  if (!data || !data.project) {
    return { status: 404, data: { error: '해당 고객에게 발행된 견적서가 없습니다. 먼저 견적을 발행해 주세요.' } };
  }

  if (!checkConvexPartnerAccess(partnerOrgId, user, data.project, data.organizations)) {
    return { status: 403, data: { error: '접근 권한이 없습니다.' } };
  }

  const allQuotes = data.quotes || [];
  if (!allQuotes.length) {
    return { status: 404, data: { error: '해당 고객에게 발행된 견적서가 없습니다. 먼저 견적을 발행해 주세요.' } };
  }

  let quote = allQuotes[0];
  let isSimulatedType = false;

  if (requestedQuoteId) {
    const byId = allQuotes.find((q) => Number(q.version) === Number(requestedQuoteId));
    if (byId) quote = byId;
  } else if (requestedType) {
    const byType = allQuotes.find((q) => (q.quoteType || '가견적') === requestedType);
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

  return {
    status: 200,
    data: {
      quote: safeQuote,
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
    },
  };
}

export async function sendProjectQuoteViaConvex(
  convexClient,
  api,
  { projectId, body, user, partnerOrgId, baseOrigin, msgCfg = {} }
) {
  const { channel = 'kakao', recipientPhone, recipientName, message, origin, quoteType, quoteId } = body || {};

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
  const quoteUrl = `${resolvedOrigin}/quote.html?token=${quote.accessToken}`;
  const safeQuoteType = quote.quoteType || '가견적';
  const defaultMsg =
    `[KCC홈씨씨] ${targetName} 고객님, 요청하신 ${data.project.product || '창호'} ${safeQuoteType}이 도착했습니다.\n` +
    `■ 견적금액: ${Number(quote.totalPrice || 0).toLocaleString()}원 (부가세 포함)\n` +
    `▼ 모바일 견적서 바로 확인하기\n${quoteUrl}`;
  const finalMessage = String(message || defaultMsg).trim();

  let providerUsed = 'simulation';
  let sendStatus = 'sent';
  let externalResponse = null;

  const webhookUrl = channel === 'kakao' ? msgCfg.kakaoWebhookUrl : msgCfg.smsWebhookUrl;
  if (msgCfg.enabled && webhookUrl) {
    providerUsed = msgCfg.provider || (channel === 'kakao' ? 'kakao_webhook' : 'sms_webhook');
    try {
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(msgCfg.apiKey ? { Authorization: `Bearer ${msgCfg.apiKey}` } : {}),
        },
        body: JSON.stringify({
          channel,
          sender: msgCfg.senderPhone || '1588-0000',
          kakaoPfId: msgCfg.kakaoPfId || undefined,
          to: cleanDigits,
          recipientName: targetName,
          message: finalMessage,
          quoteUrl,
          projectId,
          quoteId: quote.version,
        }),
      });
      if (!resp.ok) {
        sendStatus = 'failed';
        externalResponse = `HTTP ${resp.status}`;
      } else {
        externalResponse = 'delivered';
      }
    } catch (err) {
      sendStatus = 'failed';
      externalResponse = err.message;
    }
  }

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
      message:
        providerUsed === 'simulation'
          ? `${channel === 'kakao' ? '카카오 알림톡' : '문자'} 발송이 시뮬레이션 모드로 기록되었습니다. (실제 발송은 설정 → 외부 연동에서 웹훅을 활성화하세요)`
          : `${targetName} 고객님께 ${channel === 'kakao' ? '카카오 알림톡' : '문자'}을 실제 발송했습니다.`,
    },
  };
}
