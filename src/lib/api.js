// Client for the FasalRakshak Spring Boot API (server/). Used when VITE_API_URL is
// set; otherwise the app runs on Firebase or in local demo mode (see store.js).
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const apiEnabled = Boolean(API_URL);

const TOKEN_KEY = 'fr_api_token';
export function getToken() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
export function setToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} }

// JSON request with the JWT attached. Throws { status, message } on HTTP errors.
export async function api(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const token = getToken();
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
    let message = res.statusText;
    try { message = (await res.json()).message || message; } catch {}
    const err = new Error(message); err.status = res.status; throw err;
  }
  if (raw) return res;
  return res.status === 204 ? null : res.json();
}
