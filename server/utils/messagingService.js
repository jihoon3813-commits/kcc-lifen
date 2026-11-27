import crypto from 'node:crypto';

export const MESSAGING_SETTING_KEY = 'integrations_messaging';

export const DEFAULT_QUOTE_MESSAGE_TEMPLATES = {
  basic:
    '[KCC홈씨씨] #{고객명} 고객님, 우리 집 맞춤 모바일 견적서가 도착했습니다.\n\n' +
    '■ 견적 구분: #{견적구분}\n' +
    '■ 예상 금액: #{예상금액} (부가세 포함)\n' +
    '■ 결제 비교: 일시불 할인,60개월 렌탈,그린리모델링 비교 가능\n\n' +
    '■ 시공 시 혜택(1): LG가전 구독료 10% 할인 지원(최대 72개월 간 매월 10% 할인, 전 제품 대상)\n' +
    '■ 시공 시 혜택(2): KCC홈씨씨 주방 시공 시 10% 할인 지원(최종 견적 금액에서 10% 할인 적용)\n\n' +
    '▼ 나의 모바일 견적서 바로가기\n#{견적링크}\n\n' +
    '※ 열람 시 고객님 본인 성함(#{고객명})과 휴대폰 번호로 로그인해 주세요.',
  final:
    '[KCC홈씨씨] #{고객명} 고객님, 현장 실측이 반영된 최종 모바일 견적서가 발행되었습니다.\n\n' +
    '■ 견적 구분: #{견적구분}\n' +
    '■ 확정 견적가: #{예상금액} (부가세 포함)\n' +
    '■ 결제 비교: 일시불 할인,60개월 렌탈,그린리모델링 비교 가능\n\n' +
    '■ 시공 시 혜택(1): LG가전 구독료 10% 할인 지원(최대 72개월 간 매월 10% 할인, 전 제품 대상)\n' +
    '■ 시공 시 혜택(2): KCC홈씨씨 주방 시공 시 10% 할인 지원(최종 견적 금액에서 10% 할인 적용)\n\n' +
    '▼ 나의 모바일 견적서 바로가기\n#{견적링크}\n\n' +
    '※ 열람 시 고객님 본인 성함(#{고객명})과 휴대폰 번호로 로그인해 주세요.',
};

export function renderQuoteMessageTemplate(template, vars = {}) {
  const tpl = String(template || '').trim();
  if (!tpl) return '';
  const priceStr =
    vars.priceStr || `${Number(vars.totalPrice || 0).toLocaleString()}원`;
  return tpl
    .replace(/#\{고객명\}/g, String(vars.customerName ?? '고객'))
    .replace(/#\{견적구분\}/g, String(vars.quoteType ?? '가견적'))
    .replace(/#\{예상금액\}/g, priceStr)
    .replace(/#\{견적링크\}/g, String(vars.quoteUrl ?? ''))
    .replace(/#\{상품명\}/g, String(vars.product ?? '창호'));
}

function cleanDigits(val) {
  return String(val || '').replace(/\D/g, '');
}

function utf8ByteLength(str) {
  return Buffer.byteLength(String(str || ''), 'utf8');
}

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function decodeXml(str) {
  return String(str ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractXmlTag(xml, tagName) {
  const re = new RegExp(`<(?:[a-zA-Z0-9_]+:)?${tagName}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_]+:)?${tagName}>`, 'i');
  const m = String(xml || '').match(re);
  return m ? decodeXml(m[1]).trim() : '';
}

function maskSecret(val) {
  const s = String(val || '').trim();
  if (!s) return '';
  if (s.length <= 6) return '••••••';
  return `••••${s.slice(-4)}`;
}

export function isMaskedSecret(val) {
  return typeof val === 'string' && val.trim().startsWith('••••');
}

export function normalizeMessagingConfig(raw = {}, env = process.env) {
  const safeRaw = raw && typeof raw === 'object' ? raw : {};
  const pick = (rawKey, ...envKeys) => {
    const rawVal = safeRaw[rawKey];
    if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
      return String(rawVal).trim();
    }
    for (const ek of envKeys) {
      if (env[ek] && String(env[ek]).trim() !== '') {
        return String(env[ek]).trim();
      }
    }
    return '';
  };

  const kakaoProviderRaw = String(
    safeRaw.kakaoProvider ||
      env.KAKAO_PROVIDER ||
      (safeRaw.kakaoWebhookUrl || env.KAKAO_WEBHOOK_URL ? 'webhook' : 'barobill')
  )
    .trim()
    .toLowerCase();
  const kakaoProvider = ['barobill', 'aligo', 'webhook'].includes(kakaoProviderRaw)
    ? kakaoProviderRaw
    : 'barobill';

  const smsProviderRaw = String(
    safeRaw.smsProvider ||
      env.SMS_PROVIDER ||
      (safeRaw.smsWebhookUrl || env.SMS_WEBHOOK_URL ? 'webhook' : 'aligo')
  )
    .trim()
    .toLowerCase();
  const smsProvider = ['aligo', 'phone_bridge', 'webhook'].includes(smsProviderRaw)
    ? smsProviderRaw
    : 'aligo';

  const envHasCreds = Boolean(
    (env.BAROBILL_CERT_KEY && env.BAROBILL_CORP_NUM && env.BAROBILL_USER_ID) ||
      (env.ALIGO_API_KEY && env.ALIGO_USER_ID) ||
      env.SMS_BRIDGE_SECRET ||
      env.SMS_WEBHOOK_URL ||
      env.KAKAO_WEBHOOK_URL
  );
  const envEnabled =
    env.MESSAGING_ENABLED === 'true' ||
    (env.MESSAGING_ENABLED !== 'false' && envHasCreds);

  const enabled =
    safeRaw.enabled !== undefined ? Boolean(safeRaw.enabled) : Boolean(envEnabled);

  const kakaoFailoverSms =
    safeRaw.kakaoFailoverSms !== undefined
      ? Boolean(safeRaw.kakaoFailoverSms)
      : env.KAKAO_FAILOVER_SMS !== 'false';

  const barobillTestMode =
    safeRaw.barobillTestMode !== undefined
      ? Boolean(safeRaw.barobillTestMode)
      : env.BAROBILL_TEST_MODE === 'true';

  const aligoTestMode =
    safeRaw.aligoTestMode !== undefined
      ? Boolean(safeRaw.aligoTestMode)
      : env.ALIGO_TEST_MODE === 'true';

  return {
    enabled,
    kakaoProvider,
    smsProvider,
    senderPhone: pick('senderPhone', 'SMS_SENDER_PHONE') || '1588-0000',

    // 바로빌 (카카오 알림톡)
    barobillCertKey: pick('barobillCertKey', 'BAROBILL_CERT_KEY'),
    barobillCorpNum: cleanDigits(pick('barobillCorpNum', 'BAROBILL_CORP_NUM')),
    barobillUserId: pick('barobillUserId', 'BAROBILL_USER_ID'),
    barobillYellowId: pick('barobillYellowId', 'BAROBILL_YELLOW_ID', 'kakaoPfId', 'KAKAO_PF_ID'),
    barobillTestMode,
    kakaoTemplateName: pick(
      'kakaoTemplateName',
      'BAROBILL_TEMPLATE_NAME',
      'kakaoTemplateId',
      'KAKAO_TEMPLATE_ID'
    ),
    kakaoTemplateNameMeasure: pick(
      'kakaoTemplateNameMeasure',
      'BAROBILL_TEMPLATE_NAME_MEASURE',
      'kakaoTemplateIdMeasure',
      'KAKAO_TEMPLATE_ID_MEASURE'
    ),
    kakaoTemplateNameFinal: pick(
      'kakaoTemplateNameFinal',
      'BAROBILL_TEMPLATE_NAME_FINAL',
      'kakaoTemplateIdFinal',
      'KAKAO_TEMPLATE_ID_FINAL'
    ),
    kakaoButtonName: pick('kakaoButtonName', 'KAKAO_BUTTON_NAME'),
    kakaoFailoverSms,

    // 알리고 (문자 SMS/LMS)
    aligoApiKey: pick('aligoApiKey', 'ALIGO_API_KEY', 'apiKey', 'MESSAGING_API_KEY'),
    aligoUserId: pick('aligoUserId', 'ALIGO_USER_ID'),
    aligoTestMode,

    // 폰 브릿지 (안드로이드 휴대폰 연결)
    bridgeSecret: pick('bridgeSecret', 'SMS_BRIDGE_SECRET'),

    // 커스텀 웹훅 (선택)
    kakaoWebhookUrl: pick('kakaoWebhookUrl', 'KAKAO_WEBHOOK_URL'),
    smsWebhookUrl: pick('smsWebhookUrl', 'SMS_WEBHOOK_URL'),
    webhookApiKey: pick('webhookApiKey', 'MESSAGING_API_KEY'),

    // 문자·카톡 공통 발송 문구 템플릿 (어드민 편집)
    msgTemplateBasic: String(safeRaw.msgTemplateBasic || '').trim(),
    msgTemplateFinal: String(safeRaw.msgTemplateFinal || '').trim(),
  };
}

export function getMessagingChannelStatus(cfg) {
  const safe = cfg || {};
  const senderOk = cleanDigits(safe.senderPhone).length >= 8;
  const hasAnyTpl = Boolean(
    safe.kakaoTemplateName || safe.kakaoTemplateNameMeasure || safe.kakaoTemplateNameFinal
  );

  let smsReady = false;
  let kakaoReady = false;

  if (safe.enabled) {
    if (safe.smsProvider === 'aligo') {
      smsReady = Boolean(safe.aligoApiKey && safe.aligoUserId && senderOk);
    } else if (safe.smsProvider === 'phone_bridge') {
      smsReady = Boolean(safe.bridgeSecret);
    } else if (safe.smsProvider === 'webhook') {
      smsReady = Boolean(safe.smsWebhookUrl);
    }

    if (safe.kakaoProvider === 'barobill') {
      kakaoReady = Boolean(
        safe.barobillCertKey &&
          cleanDigits(safe.barobillCorpNum).length === 10 &&
          safe.barobillUserId &&
          safe.barobillYellowId &&
          hasAnyTpl
      );
    } else if (safe.kakaoProvider === 'aligo') {
      kakaoReady = Boolean(
        safe.aligoApiKey && safe.aligoUserId && safe.barobillYellowId && hasAnyTpl && senderOk
      );
    } else if (safe.kakaoProvider === 'webhook') {
      kakaoReady = Boolean(safe.kakaoWebhookUrl);
    }
  }

  return {
    enabled: Boolean(safe.enabled),
    kakaoProvider: safe.kakaoProvider || 'barobill',
    smsProvider: safe.smsProvider || 'aligo',
    smsReady,
    kakaoReady,
    live: smsReady || kakaoReady,
    senderPhone: safe.senderPhone || '',
    hasBarobillYellowId: Boolean(safe.barobillYellowId),
    hasKakaoTemplate: hasAnyTpl,
    templates: {
      basic: String(safe.msgTemplateBasic || '').trim(),
      final: String(safe.msgTemplateFinal || '').trim(),
    },
  };
}

export function sanitizeMessagingConfigForClient(cfg) {
  const status = getMessagingChannelStatus(cfg);
  return {
    enabled: Boolean(cfg.enabled),
    kakaoProvider: cfg.kakaoProvider || 'barobill',
    smsProvider: cfg.smsProvider || 'aligo',
    senderPhone: cfg.senderPhone || '1588-0000',

    barobillCertKey: maskSecret(cfg.barobillCertKey),
    hasBarobillCertKey: Boolean(cfg.barobillCertKey),
    barobillCorpNum: cfg.barobillCorpNum || '',
    barobillUserId: cfg.barobillUserId || '',
    barobillYellowId: cfg.barobillYellowId || '',
    barobillTestMode: Boolean(cfg.barobillTestMode),
    kakaoTemplateName: cfg.kakaoTemplateName || '',
    kakaoTemplateNameMeasure: cfg.kakaoTemplateNameMeasure || '',
    kakaoTemplateNameFinal: cfg.kakaoTemplateNameFinal || '',
    kakaoButtonName: cfg.kakaoButtonName || '',
    kakaoFailoverSms: cfg.kakaoFailoverSms !== false,

    aligoApiKey: maskSecret(cfg.aligoApiKey),
    hasAligoApiKey: Boolean(cfg.aligoApiKey),
    aligoUserId: cfg.aligoUserId || '',
    aligoTestMode: Boolean(cfg.aligoTestMode),

    bridgeSecret: maskSecret(cfg.bridgeSecret),
    hasBridgeSecret: Boolean(cfg.bridgeSecret),

    kakaoWebhookUrl: cfg.kakaoWebhookUrl || '',
    smsWebhookUrl: cfg.smsWebhookUrl || '',
    webhookApiKey: maskSecret(cfg.webhookApiKey),
    hasWebhookApiKey: Boolean(cfg.webhookApiKey),
    msgTemplateBasic: cfg.msgTemplateBasic || '',
    msgTemplateFinal: cfg.msgTemplateFinal || '',
    status,
  };
}

export function mergeMessagingConfigUpdate(existingRaw = {}, incoming = {}) {
  const prev = existingRaw && typeof existingRaw === 'object' ? existingRaw : {};
  const next = {
    enabled: Boolean(incoming.enabled),
    kakaoProvider: ['barobill', 'aligo', 'webhook'].includes(
      String(incoming.kakaoProvider || '').toLowerCase()
    )
      ? String(incoming.kakaoProvider).toLowerCase()
      : prev.kakaoProvider || 'barobill',
    smsProvider: ['aligo', 'phone_bridge', 'webhook'].includes(
      String(incoming.smsProvider || '').toLowerCase()
    )
      ? String(incoming.smsProvider).toLowerCase()
      : prev.smsProvider || 'aligo',
    senderPhone: String(incoming.senderPhone ?? prev.senderPhone ?? '').trim(),

    barobillCorpNum: cleanDigits(incoming.barobillCorpNum ?? prev.barobillCorpNum ?? ''),
    barobillUserId: String(incoming.barobillUserId ?? prev.barobillUserId ?? '').trim(),
    barobillYellowId: String(incoming.barobillYellowId ?? prev.barobillYellowId ?? '').trim(),
    barobillTestMode:
      incoming.barobillTestMode !== undefined
        ? Boolean(incoming.barobillTestMode)
        : Boolean(prev.barobillTestMode),
    kakaoTemplateName: String(incoming.kakaoTemplateName ?? prev.kakaoTemplateName ?? '').trim(),
    kakaoTemplateNameMeasure: String(
      incoming.kakaoTemplateNameMeasure ?? prev.kakaoTemplateNameMeasure ?? ''
    ).trim(),
    kakaoTemplateNameFinal: String(
      incoming.kakaoTemplateNameFinal ?? prev.kakaoTemplateNameFinal ?? ''
    ).trim(),
    kakaoButtonName: String(incoming.kakaoButtonName ?? prev.kakaoButtonName ?? '').trim(),
    kakaoFailoverSms:
      incoming.kakaoFailoverSms !== undefined
        ? Boolean(incoming.kakaoFailoverSms)
        : prev.kakaoFailoverSms !== false,

    aligoUserId: String(incoming.aligoUserId ?? prev.aligoUserId ?? '').trim(),
    aligoTestMode:
      incoming.aligoTestMode !== undefined
        ? Boolean(incoming.aligoTestMode)
        : Boolean(prev.aligoTestMode),

    kakaoWebhookUrl: String(incoming.kakaoWebhookUrl ?? prev.kakaoWebhookUrl ?? '').trim(),
    smsWebhookUrl: String(incoming.smsWebhookUrl ?? prev.smsWebhookUrl ?? '').trim(),
    msgTemplateBasic:
      incoming.msgTemplateBasic !== undefined
        ? String(incoming.msgTemplateBasic).trim()
        : String(prev.msgTemplateBasic || '').trim(),
    msgTemplateFinal:
      incoming.msgTemplateFinal !== undefined
        ? String(incoming.msgTemplateFinal).trim()
        : String(prev.msgTemplateFinal || '').trim(),
  };

  const keepSecret = (incomingVal, prevVal) => {
    const s = String(incomingVal ?? '').trim();
    if (!s || isMaskedSecret(s)) return String(prevVal || '').trim();
    return s;
  };

  next.barobillCertKey = keepSecret(incoming.barobillCertKey, prev.barobillCertKey);
  next.aligoApiKey = keepSecret(incoming.aligoApiKey ?? incoming.apiKey, prev.aligoApiKey ?? prev.apiKey);
  next.bridgeSecret = keepSecret(incoming.bridgeSecret, prev.bridgeSecret);
  next.webhookApiKey = keepSecret(incoming.webhookApiKey, prev.webhookApiKey);

  return next;
}

export async function loadRawMessagingConfig(convexClient, api, sqliteDb = null) {
  let raw = null;
  if (convexClient && api?.settings?.getSetting) {
    try {
      const setting = await convexClient.query(api.settings.getSetting, {
        key: MESSAGING_SETTING_KEY,
      });
      if (setting?.value) {
        raw = JSON.parse(setting.value);
      }
    } catch (err) {
      console.warn('[Messaging] Failed to load config from Convex:', err?.message || err);
    }
  }
  if (!raw && sqliteDb) {
    try {
      const row = sqliteDb
        .prepare("SELECT config_json FROM integration_configs WHERE key = 'messaging'")
        .get();
      if (row?.config_json) raw = JSON.parse(row.config_json);
    } catch {}
  }
  return raw || {};
}

export async function resolveMessagingConfig(convexClient, api, sqliteDb = null) {
  const raw = await loadRawMessagingConfig(convexClient, api, sqliteDb);
  return normalizeMessagingConfig(raw, process.env);
}

function selectKakaoTemplateName(cfg, tplKey) {
  if (tplKey === 'final') return cfg.kakaoTemplateNameFinal || cfg.kakaoTemplateName || '';
  if (tplKey === 'measure') return cfg.kakaoTemplateNameMeasure || cfg.kakaoTemplateName || '';
  return (
    cfg.kakaoTemplateName ||
    cfg.kakaoTemplateNameFinal ||
    cfg.kakaoTemplateNameMeasure ||
    ''
  );
}

async function fetchBarobillErrString(endpoint, certKey, errCode) {
  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetErrString xmlns="http://ws.baroservice.com/">
      <CERTKEY>${escapeXml(certKey)}</CERTKEY>
      <ErrCode>${Number(errCode)}</ErrCode>
    </GetErrString>
  </soap:Body>
</soap:Envelope>`;
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '"http://ws.baroservice.com/GetErrString"',
      },
      body: soapBody,
    });
    const xml = await resp.text();
    return extractXmlTag(xml, 'GetErrStringResult');
  } catch {
    return '';
  }
}

async function sendViaBarobillKakao(cfg, payload) {
  const to = cleanDigits(payload.to);
  const sender = cleanDigits(cfg.senderPhone);
  const corpNum = cleanDigits(cfg.barobillCorpNum);
  const templateName = selectKakaoTemplateName(cfg, payload.tplKey);

  if (!cfg.barobillCertKey || corpNum.length !== 10 || !cfg.barobillUserId) {
    return {
      ok: false,
      status: 400,
      provider: 'barobill',
      error: '바로빌 인증키(CERTKEY), 사업자등록번호(10자리), 회원 아이디를 확인해 주세요.',
    };
  }
  if (!cfg.barobillYellowId || !templateName) {
    return {
      ok: false,
      status: 400,
      provider: 'barobill',
      error: '바로빌 카카오톡 채널 ID(@아이디) 및 승인된 알림톡 템플릿명을 입력해 주세요.',
    };
  }

  const endpoint = cfg.barobillTestMode
    ? 'https://testws.baroservice.com/KAKAOTALK.asmx'
    : 'https://ws.baroservice.com/KAKAOTALK.asmx';

  const subject = `[KCC홈씨씨] ${payload.quoteType || '모바일 견적서'} 안내`;
  const smsReply = cfg.kakaoFailoverSms && sender.length >= 8 ? 'A' : 'N';
  const buttonsXml =
    cfg.kakaoButtonName && payload.quoteUrl
      ? `<Buttons>
          <KakaotalkButton>
            <Name>${escapeXml(cfg.kakaoButtonName)}</Name>
            <ButtonType>WL</ButtonType>
            <Url1>${escapeXml(payload.quoteUrl)}</Url1>
            <Url2>${escapeXml(payload.quoteUrl)}</Url2>
          </KakaotalkButton>
        </Buttons>`
      : '';

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SendATKakaotalkEx xmlns="http://ws.baroservice.com/">
      <CERTKEY>${escapeXml(cfg.barobillCertKey)}</CERTKEY>
      <CorpNum>${escapeXml(corpNum)}</CorpNum>
      <SenderID>${escapeXml(cfg.barobillUserId)}</SenderID>
      <YellowId>${escapeXml(cfg.barobillYellowId)}</YellowId>
      <TemplateName>${escapeXml(templateName)}</TemplateName>
      <SendDT></SendDT>
      <SmsReply>${smsReply}</SmsReply>
      <SmsSenderNum>${escapeXml(sender)}</SmsSenderNum>
      <KakaotalkMessage>
        <ReceiverName>${escapeXml(payload.recipientName || '고객')}</ReceiverName>
        <ReceiverNum>${escapeXml(to)}</ReceiverNum>
        <Title>${escapeXml(subject)}</Title>
        <Message>${escapeXml(payload.message || '')}</Message>
        <SmsMessage>${escapeXml(smsReply === 'A' ? payload.message || '' : '')}</SmsMessage>
        <SmsSubject>${escapeXml(smsReply === 'A' ? subject : '')}</SmsSubject>
        ${buttonsXml}
      </KakaotalkMessage>
    </SendATKakaotalkEx>
  </soap:Body>
</soap:Envelope>`;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: '"http://ws.baroservice.com/SendATKakaotalkEx"',
    },
    body: soapBody,
  });

  const xml = await resp.text();
  if (!resp.ok) {
    const fault = extractXmlTag(xml, 'faultstring');
    return {
      ok: false,
      status: 502,
      provider: 'barobill',
      error: fault || `바로빌 API 호출 오류 (HTTP ${resp.status})`,
    };
  }

  const resultVal = extractXmlTag(xml, 'SendATKakaotalkExResult');
  if (!resultVal) {
    return {
      ok: false,
      status: 502,
      provider: 'barobill',
      error: '바로빌 응답에서 접수결과를 확인할 수 없습니다.',
    };
  }

  if (/^-\d+$/.test(resultVal)) {
    const errText = await fetchBarobillErrString(endpoint, cfg.barobillCertKey, resultVal);
    return {
      ok: false,
      status: 502,
      provider: 'barobill',
      error: errText ? `[바로빌 ${resultVal}] ${errText}` : `바로빌 오류 코드: ${resultVal}`,
    };
  }

  return {
    ok: true,
    simulated: false,
    provider: 'barobill',
    detail: `sendKey:${resultVal}`,
  };
}

async function sendViaAligo(cfg, payload) {
  const to = cleanDigits(payload.to);
  const sender = cleanDigits(cfg.senderPhone);
  const channel = payload.channel === 'sms' ? 'sms' : 'kakao';

  if (!cfg.aligoApiKey || !cfg.aligoUserId) {
    return {
      ok: false,
      status: 400,
      provider: 'aligo',
      error: '알리고(Aligo) API Key 및 사용자 ID가 설정되지 않았습니다.',
    };
  }
  if (sender.length < 8) {
    return {
      ok: false,
      status: 400,
      provider: 'aligo',
      error: '알리고에 사전 등록된 발신 대표번호가 올바르지 않습니다.',
    };
  }

  if (channel === 'kakao') {
    const tplCode = selectKakaoTemplateName(cfg, payload.tplKey);
    if (!cfg.barobillYellowId || !tplCode) {
      return {
        ok: false,
        status: 400,
        provider: 'aligo',
        error:
          '알리고 카카오 알림톡 발송에 필요한 SenderKey 또는 템플릿 코드가 설정되지 않았습니다.',
      };
    }

    const tokenForm = new URLSearchParams({
      apikey: cfg.aligoApiKey,
      userid: cfg.aligoUserId,
    });
    const tokenResp = await fetch('https://kakaoapi.aligo.in/akv10/token/create/30/s/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenForm.toString(),
    });
    const tokenData = await tokenResp.json().catch(() => ({}));
    if (!tokenResp.ok || Number(tokenData?.code) !== 0 || !tokenData?.token) {
      return {
        ok: false,
        status: 502,
        provider: 'aligo',
        error: tokenData?.message || `알리고 토큰 발급 실패 (HTTP ${tokenResp.status})`,
      };
    }

    const subject = `[KCC홈씨씨] ${payload.quoteType || '모바일 견적서'} 안내`;
    const sendForm = new URLSearchParams({
      apikey: cfg.aligoApiKey,
      userid: cfg.aligoUserId,
      token: tokenData.token,
      senderkey: cfg.barobillYellowId,
      tpl_code: tplCode,
      sender,
      receiver_1: to,
      recvname_1: String(payload.recipientName || '고객'),
      subject_1: subject,
      message_1: String(payload.message || ''),
    });

    if (cfg.aligoTestMode) {
      sendForm.set('testMode', 'Y');
    }
    if (cfg.kakaoFailoverSms) {
      sendForm.set('failover', 'Y');
      sendForm.set('fsubject_1', subject);
      sendForm.set('fmessage_1', String(payload.message || ''));
    }
    if (cfg.kakaoButtonName && payload.quoteUrl) {
      sendForm.set(
        'button_1',
        JSON.stringify({
          button: [
            {
              name: cfg.kakaoButtonName,
              linkType: 'WL',
              linkTypeName: '웹링크',
              linkMo: payload.quoteUrl,
              linkPc: payload.quoteUrl,
            },
          ],
        })
      );
    }

    const resp = await fetch('https://kakaoapi.aligo.in/akv10/alimtalk/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: sendForm.toString(),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || Number(data?.code) !== 0) {
      return {
        ok: false,
        status: 502,
        provider: 'aligo',
        error: data?.message || `알리고 알림톡 발송 실패 (HTTP ${resp.status})`,
        raw: data,
      };
    }
    return {
      ok: true,
      simulated: false,
      provider: 'aligo',
      detail: data?.info?.mid ? `mid:${data.info.mid}` : 'delivered',
      raw: data,
    };
  }

  // SMS / LMS via Aligo
  const text = String(payload.message || '').trim();
  const isLms = utf8ByteLength(text) > 90;
  const smsForm = new URLSearchParams({
    key: cfg.aligoApiKey,
    user_id: cfg.aligoUserId,
    sender,
    receiver: to,
    msg: text,
    msg_type: isLms ? 'LMS' : 'SMS',
    ...(isLms ? { title: `[KCC홈씨씨] ${payload.quoteType || '모바일 견적서'} 안내` } : {}),
    ...(cfg.aligoTestMode ? { testmode_yn: 'Y' } : {}),
  });

  const resp = await fetch('https://apis.aligo.in/send/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: smsForm.toString(),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || Number(data?.result_code) !== 1) {
    return {
      ok: false,
      status: 502,
      provider: 'aligo',
      error: data?.message || `알리고 문자 발송 실패 (HTTP ${resp.status})`,
      raw: data,
    };
  }
  return {
    ok: true,
    simulated: false,
    provider: 'aligo',
    detail: data?.msg_id ? `msg_id:${data.msg_id}` : 'delivered',
    raw: data,
  };
}

async function sendViaWebhook(cfg, payload) {
  const channel = payload.channel === 'sms' ? 'sms' : 'kakao';
  const webhookUrl = channel === 'kakao' ? cfg.kakaoWebhookUrl : cfg.smsWebhookUrl;
  if (!webhookUrl) {
    return {
      ok: false,
      status: 400,
      provider: channel === 'kakao' ? 'kakao_webhook' : 'sms_webhook',
      error: `${channel === 'kakao' ? '카카오 알림톡' : '문자'} 발송 웹훅 URL이 설정되지 않았습니다.`,
    };
  }

  const resp = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cfg.webhookApiKey ? { Authorization: `Bearer ${cfg.webhookApiKey}` } : {}),
    },
    body: JSON.stringify({
      channel,
      sender: cfg.senderPhone || '1588-0000',
      yellowId: cfg.barobillYellowId || undefined,
      templateName: selectKakaoTemplateName(cfg, payload.tplKey) || undefined,
      to: cleanDigits(payload.to),
      recipientName: payload.recipientName,
      message: payload.message,
      quoteUrl: payload.quoteUrl,
      projectId: payload.projectId,
      quoteId: payload.quoteId,
      quoteType: payload.quoteType,
      product: payload.product,
      totalPrice: payload.totalPrice,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    return {
      ok: false,
      status: 502,
      provider: channel === 'kakao' ? 'kakao_webhook' : 'sms_webhook',
      error: errText ? `HTTP ${resp.status}: ${errText.slice(0, 120)}` : `HTTP ${resp.status}`,
    };
  }

  return {
    ok: true,
    simulated: false,
    provider: channel === 'kakao' ? 'kakao_webhook' : 'sms_webhook',
    detail: 'delivered',
  };
}

async function sendViaPhoneBridge(cfg, payload, context = {}) {
  const to = cleanDigits(payload.to);
  if (to.length < 10) {
    return { ok: false, status: 400, provider: 'phone_bridge', error: '수신 휴대폰 번호가 올바르지 않습니다.' };
  }
  const { convexClient, api } = context || {};
  if (!convexClient || !api?.smsBridge?.enqueueOutbox) {
    return {
      ok: false,
      status: 500,
      provider: 'phone_bridge',
      error: '폰 브릿지 대기열(Convex)에 연결할 수 없습니다.',
    };
  }
  const title = `[KCC홈씨씨] ${payload.quoteType || '모바일 견적서'} 안내`;
  const res = await convexClient.mutation(api.smsBridge.enqueueOutbox, {
    receiverPhone: to,
    title,
    message: String(payload.message || '').trim(),
    projectId: payload.projectId ? Number(payload.projectId) : undefined,
    quoteId: payload.quoteId ? Number(payload.quoteId) : undefined,
    recipientName: payload.recipientName ? String(payload.recipientName) : undefined,
    createdBy: payload.sentBy ? String(payload.sentBy) : undefined,
  });
  return {
    ok: true,
    simulated: false,
    provider: 'phone_bridge',
    detail: res?.outboxId ? `queued:${res.outboxId}` : 'queued',
    raw: res,
  };
}

export async function dispatchMessage(cfg, payload, context = {}) {
  const status = getMessagingChannelStatus(cfg);
  const channel = payload.channel === 'sms' ? 'sms' : 'kakao';

  if (!cfg?.enabled) {
    return {
      ok: true,
      simulated: true,
      provider: 'simulation',
      detail: 'simulation_disabled',
    };
  }

  const channelReady = channel === 'kakao' ? status.kakaoReady : status.smsReady;
  if (!channelReady) {
    const hasAnyKey = Boolean(
      cfg.barobillCertKey ||
        cfg.aligoApiKey ||
        cfg.aligoUserId ||
        cfg.bridgeSecret ||
        cfg.smsWebhookUrl ||
        cfg.kakaoWebhookUrl
    );
    if (!status.live && !hasAnyKey) {
      return {
        ok: true,
        simulated: true,
        provider: 'simulation',
        detail: 'simulation_unconfigured',
      };
    }

    let missingHint = '';
    if (channel === 'kakao') {
      missingHint =
        cfg.kakaoProvider === 'barobill'
          ? '바로빌 인증키(CERTKEY), 사업자번호(10자리), 회원 ID, 채널 @아이디, 승인된 템플릿명이 필요합니다.'
          : cfg.kakaoProvider === 'aligo'
            ? '알리고 API Key, User ID, SenderKey, 템플릿 코드, 발신 대표번호가 필요합니다.'
            : '카카오 알림톡 발송 웹훅 URL이 필요합니다.';
    } else {
      missingHint =
        cfg.smsProvider === 'aligo'
          ? '알리고 API Key, User ID, 사전 등록된 발신 대표번호가 필요합니다.'
          : cfg.smsProvider === 'phone_bridge'
            ? '폰 브릿지 시크릿 키가 필요합니다.'
            : '문자 발송 웹훅 URL이 필요합니다.';
    }

    return {
      ok: false,
      status: 400,
      provider: channel === 'kakao' ? cfg.kakaoProvider : cfg.smsProvider,
      error: `${channel === 'kakao' ? '카카오 알림톡' : '문자(LMS/SMS)'} 실발송 설정이 완료되지 않았습니다. (${missingHint})`,
    };
  }

  try {
    if (channel === 'kakao') {
      if (cfg.kakaoProvider === 'barobill') return await sendViaBarobillKakao(cfg, payload);
      if (cfg.kakaoProvider === 'aligo') return await sendViaAligo(cfg, payload);
      return await sendViaWebhook(cfg, payload);
    }
    if (cfg.smsProvider === 'aligo') {
      return await sendViaAligo(cfg, payload);
    }
    if (cfg.smsProvider === 'phone_bridge') {
      return await sendViaPhoneBridge(cfg, payload, context);
    }
    return await sendViaWebhook(cfg, payload);
  } catch (err) {
    return {
      ok: false,
      status: 502,
      provider: channel === 'kakao' ? cfg.kakaoProvider : cfg.smsProvider,
      error: err?.message || '외부 발송 서버 연결 중 오류가 발생했습니다.',
    };
  }
}
