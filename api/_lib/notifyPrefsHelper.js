export const DEFAULT_NOTIFY_PREFS = {
  newCustomer: { sms: false, kakao: false },
  newQuote: { sms: false, kakao: false },
};

function emptyPrefs() {
  return {
    newCustomer: { sms: false, kakao: false },
    newQuote: { sms: false, kakao: false },
  };
}

/**
 * Parse and normalize user notification preferences.
 * Partner accounts are always excluded from staff admin notifications.
 */
export function parseNotifyPrefs(raw, role = "") {
  if (role === "partner") return emptyPrefs();

  let obj = raw;
  if (typeof obj === "string") {
    try {
      obj = JSON.parse(obj);
    } catch {
      obj = null;
    }
  }
  if (!obj || typeof obj !== "object") return emptyPrefs();

  return {
    newCustomer: {
      sms: Boolean(obj.newCustomer?.sms),
      kakao: Boolean(obj.newCustomer?.kakao),
    },
    newQuote: {
      sms: Boolean(obj.newQuote?.sms),
      kakao: Boolean(obj.newQuote?.kakao),
    },
  };
}

/**
 * Validate incoming notify_prefs payload from API requests.
 */
export function validateNotifyPrefs(input, role = "") {
  if (role === "partner") {
    return { ok: true, prefs: emptyPrefs() };
  }
  if (input === undefined || input === null) {
    return { ok: true, prefs: emptyPrefs() };
  }
  const prefs = parseNotifyPrefs(input, role);
  return { ok: true, prefs };
}
