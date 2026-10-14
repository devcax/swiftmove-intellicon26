const config = require('../config');

const SESSION_COOKIE = 'fl_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_COOKIE_VALUE = 200;

/** Read cookies from the Cookie header. Ignores malformed pairs. */
function parseCookies(header) {
  const cookies = {};
  for (const pair of String(header ?? '').split(';')) {
    const at = pair.indexOf('=');
    if (at < 1) continue;
    const name = pair.slice(0, at).trim();
    let value = pair.slice(at + 1).trim();
    if (value.length > MAX_COOKIE_VALUE) continue;
    try { value = decodeURIComponent(value); } catch { continue; }
    cookies[name] ??= value;
  }
  return cookies;
}

const COOKIE_OPTIONS = () => ({ httpOnly: true, secure: config.isProduction, sameSite: 'lax', path: '/' });

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, { ...COOKIE_OPTIONS(), maxAge: SESSION_TTL_MS });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS());
}

const sessionTokenOf = (req) => parseCookies(req.headers.cookie)[SESSION_COOKIE];

module.exports = { SESSION_COOKIE, SESSION_TTL_MS, parseCookies, setSessionCookie, clearSessionCookie, sessionTokenOf };
