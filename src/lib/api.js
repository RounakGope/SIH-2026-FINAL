// Client for the FasalRakshak Spring Boot API (server/). Used when VITE_API_URL is
// set; otherwise the app runs on Firebase or in local demo mode (see store.js).
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const apiEnabled = Boolean(API_URL);

// One browser can hold two identities at once: the farmer app (/) and the KVK
// dashboard (/staff, and its SMS log at /sms). Each keeps its own token.
const KEYS = { farmer: 'fr_api_token', staff: 'fr_api_staff_token' };
export function getToken(who = 'farmer') { try { return localStorage.getItem(KEYS[who]); } catch { return null; } }
export function setToken(t, who = 'farmer') { try { t ? localStorage.setItem(KEYS[who], t) : localStorage.removeItem(KEYS[who]); } catch {} }

// Staff endpoints take the staff token; shared ones (reports, speech) take the
// staff token on the staff pages and the farmer's everywhere else.
const staffPath = path => /^\/(staff|sms)(\/|\?|$)/.test(path);
const onStaffPage = () => typeof location !== 'undefined' && /^\/(staff|sms)(\/|$)/.test(location.pathname);
function roleFor(path) {
  if (path.startsWith('/auth/')) return null;
  return staffPath(path) || (onStaffPage() && getToken('staff')) ? 'staff' : 'farmer';
}

// Called with 'farmer' or 'staff' when the server rejects that token (expired, or
// the server's secret changed). store.js signs back in.
let expired = () => {};
export function onTokenRejected(fn) { expired = fn; }

// JSON request with the JWT attached. Throws { status, message } on HTTP errors.
export async function api(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const who = roleFor(path);
  const token = who && getToken(who);
  const res = await fetch(API_URL + path, {
    method,
    headers: {
      ...(body !== undefined && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...headers
    },
    body: body === undefined || body instanceof FormData ? body : JSON.stringify(body)
  });
  if (!res.ok) {
    if (res.status === 401 && token) { setToken(null, who); expired(who); }
    let message = res.statusText || 'HTTP ' + res.status;
    try { message = (await res.json()).message || message; } catch {}
    const err = new Error(message); err.status = res.status; throw err;
  }
  if (raw) return res;
  return res.status === 204 ? null : res.json();
}
