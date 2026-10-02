// One data API for the whole app, three backends:
//   api      — the Spring Boot server (server/) when VITE_API_URL is set. Writes go
//              to an IndexedDB outbox first and sync with idempotency keys, so a
//              flaky 2G retry can never double-write.
//   firebase — Firestore when the VITE_FIREBASE_* keys are set.
//   local    — localStorage only ("local demo mode", data stays in this browser).
//
// A "case" is one field scan (a 10-plant walk). Shape:
// { id, uid, plotId, district, taluka, crop, cropDay, stage, lat, lon, acres, label,
//   confidence, top3: [{label, p}], leafPct, sevIndex, plantsInfected, plantsWalked,
//   photo, status, expert: {label, by, at, note} | null, share, phone?, lang,
//   treatment?: {tier, product, at}, prevTreatment?, improved?, kind?: 'ivr',
//   transcript?, serverCheck?: {label, p, agrees, at}, createdAt (ms), seed? }
// status: 'auto' | 'pending_review' | 'confirmed' | 'corrected' | 'lab_referred'
import { firebaseEnabled, db, auth } from './firebase';
import {
  collection, doc, setDoc, onSnapshot, query, where, writeBatch, getDocs, getDoc
} from 'firebase/firestore';
import {
  onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut
} from 'firebase/auth';
import { api, apiEnabled, setToken, getToken, onTokenRejected } from './api';
import { idb } from './idb';
import { CELL } from '../content/outbreaks';

export const mode = apiEnabled ? 'api' : firebaseEnabled ? 'firebase' : 'local';

// ---------- small helpers ----------
export function newId() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
function readLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('localStorage full?', e); }
}

// Change listeners per localStorage key, also fired by other tabs of the same
// browser (the "storage" event), so a farmer tab and a staff tab stay in step.
const listeners = {};
function notify(key) { (listeners[key] || new Set()).forEach(fn => fn()); }
function listen(key, fn) {
  (listeners[key] ||= new Set()).add(fn); fn();
  return () => listeners[key].delete(fn);
}
if (typeof window !== 'undefined') window.addEventListener('storage', e => { if (e.key) notify(e.key); });

// Polls an API endpoint while something is watching it.
function poll(path, cb, ms = 5000) {
  let stop = false;
  const run = async () => { if (stop) return; try { cb(await api(path)); } catch (e) { console.warn(path, e.message); } };
  run(); const t = setInterval(run, ms);
  return () => { stop = true; clearInterval(t); };
}

// ---------- plots (a farmer's field) ----------
// A plot: { id, phone?, smsConsent, share, crop, sowDate ("YYYY-MM"), area, areaUnit,
//           acres (area converted, used for all maths), lat, lon, taluka, traps }
const PLOTS = 'fr_plots', ACTIVE = 'fr_active';
function migrate() {
  if (readLocal(PLOTS, null)) return;
  const old = readLocal('fr_farm', null); // single-farm version of the app
  if (old) { const p = { id: newId(), ...old }; writeLocal(PLOTS, [p]); writeLocal(ACTIVE, p.id); }
}
export function getPlots() { migrate(); return readLocal(PLOTS, []); }
export function getFarm() {
  const plots = getPlots(), id = readLocal(ACTIVE, null);
  return plots.find(p => p.id === id) || plots[0] || null;
}
export function saveFarm(farm, uid) {
  const plot = farm.id ? farm : { ...farm, id: newId() };
  const plots = getPlots();
  const i = plots.findIndex(p => p.id === plot.id);
  if (i >= 0) plots[i] = plot; else plots.push(plot);
  writeLocal(PLOTS, plots); writeLocal(ACTIVE, plot.id); notify(PLOTS);
  if (mode === 'api') queue({ type: 'plot', plot });
  else if (mode === 'firebase' && uid) {
    setDoc(doc(db, 'farms', uid), { ...plot, updatedAt: Date.now() }, { merge: true }).catch(e => console.warn('farm sync', e));
  }
  return plot;
}
export function watchPlots(cb) { return listen(PLOTS, () => cb(getPlots(), getFarm())); }

// ---------- auth ----------
// Farmers: anonymous identity per device (Firebase anonymous auth, or a device
// token from the API). Needs network once; afterwards it persists offline.
export function initFarmer(cb) {
  let uid = readLocal('fr_uid', null);
  if (!uid) { uid = 'local-' + newId(); writeLocal('fr_uid', uid); }
  if (mode === 'api') {
    const ready = () => { cb({ uid: readLocal('fr_api_uid', uid), anonymous: true }); startSync(); };
    if (getToken()) ready();
    else {
      cb({ uid: readLocal('fr_api_uid', uid), anonymous: true }); // works offline straight away
      deviceAuth(ready);
    }
    return () => {};
  }
  if (mode === 'local') { cb({ uid, anonymous: true }); return () => {}; }
  return onAuthStateChanged(auth, user => {
    if (user) cb({ uid: user.uid, anonymous: user.isAnonymous, email: user.email });
    else signInAnonymously(auth).catch(e => { console.warn('anon sign-in', e); cb(null); });
  });
}

const STAFF = 'fr_staff'; // the signed-in staff member (API mode)

// The device's token from the API, retried until the network is there. The same
// device id always gets the same uid back, so nothing is lost if a token is refused.
let authing = false;
function deviceAuth(then) {
  if (authing || !readLocal('fr_uid', null)) return;
  authing = true;
  const tryAuth = () => api('/auth/device', { method: 'POST', body: { deviceId: readLocal('fr_uid', null) } })
    .then(r => { authing = false; setToken(r.token); writeLocal('fr_api_uid', r.uid); then(); })
    .catch(() => setTimeout(tryAuth, 15000));
  tryAuth();
}
if (mode === 'api') onTokenRejected(who => {
  if (who === 'farmer') deviceAuth(flush);
  else { writeLocal(STAFF, null); notify(STAFF); } // back to the staff login
});

// Staff (KVK expert / district officer).
export function watchStaff(cb) {
  if (mode === 'local') { cb({ uid: 'local-staff', email: 'demo@local', role: 'officer' }); return () => {}; }
  if (mode === 'api') return listen(STAFF, () => cb(readLocal(STAFF, null)));
  return onAuthStateChanged(auth, user => cb(user && !user.isAnonymous ? { uid: user.uid, email: user.email, role: 'officer' } : null));
}
export async function staffLogin(email, password) {
  if (mode === 'api') {
    const r = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(r.token, 'staff'); writeLocal(STAFF, { uid: r.uid, email: r.email, role: r.role }); notify(STAFF);
    return r;
  }
  return signInWithEmailAndPassword(auth, email, password);
}
export function staffLogout() {
  if (mode === 'api') { setToken(null, 'staff'); writeLocal(STAFF, null); notify(STAFF); return Promise.resolve(); }
  return mode === 'firebase' ? signOut(auth) : Promise.resolve();
}

// ---------- anonymous reports ----------
// Raw cases (photo, uid, exact location, phone) are private to the farmer and
// staff. Other farmers see only a "report": crop, disease, status, confidence,
// the day, the taluka, a ~5 km grid cell, the field severity, the farm size in
// whole acres, and whether the last treatment worked. A plot whose farmer hasn't
// explicitly agreed to share (DPDP consent: opt-in, revocable) publishes nothing.
export const shared = c => c.seed || c.share === true;
const DAY_MS = 86400000;
export function reportOf(c) {
  const r = { id: c.id };
  for (const k of ['taluka', 'crop', 'label', 'status', 'confidence']) if (c[k] !== undefined) r[k] = c[k];
  if (c.createdAt !== undefined) r.createdAt = Math.floor(c.createdAt / DAY_MS) * DAY_MS;
  if (c.lat !== undefined && c.lon !== undefined) { r.cy = Math.round(c.lat * CELL); r.cx = Math.round(c.lon * CELL); }
  if (c.sevIndex !== undefined) r.sev = Math.round(c.sevIndex);
  if (c.acres !== undefined) r.acres = Math.round(c.acres);
  if (c.prevTreatment !== undefined) r.treated = c.prevTreatment;
  if (c.improved !== undefined) r.improved = c.improved;
  return r;
}

// ---------- cases ----------
const CASES = 'fr_cases';
function localAll() { return readLocal(CASES, []); }
function localSave(list) { writeLocal(CASES, list); notify(CASES); }
function localWatch(filter, cb) { return listen(CASES, () => cb(localAll().filter(filter), 0)); }

// Save or update a case. Never await this in the UI: it is safe on the phone as
// soon as it returns, and uploads by itself.
export function upsertCase(c) {
  if (mode === 'local') {
    const list = localAll();
    const i = list.findIndex(x => x.id === c.id);
    if (i >= 0) list[i] = { ...list[i], ...c }; else list.push(c);
    localSave(list);
    return;
  }
  if (mode === 'api') {
    idb.get('cases', c.id).then(prev => {
      idb.put('cases', c.id, { ...(prev || {}), ...c }).then(() => notify(CASES));
      queue({ type: 'case', case: c });
    });
    return;
  }
  const b = writeBatch(db);
  b.set(doc(db, 'cases', c.id), c, { merge: true });
  if (shared(c)) b.set(doc(db, 'reports', c.id), reportOf(c), { merge: true });
  b.commit().catch(e => console.warn('case sync', e));
}

// Farmer's own cases + how many are still waiting to upload.
export function watchMyCases(uid, cb) {
  if (mode === 'local') return localWatch(c => c.uid === uid, cb);
  if (mode === 'api') {
    const run = async () => {
      const [cases, ops] = await Promise.all([idb.all('cases'), idb.keys('outbox')]);
      cb(cases.filter(c => !c.seed), ops.length);
    };
    const off = listen(CASES, run);
    const offOut = listen(OUTBOX, run);
    return () => { off(); offOut(); };
  }
  const q = query(collection(db, 'cases'), where('uid', '==', uid));
  return onSnapshot(q, { includeMetadataChanges: true }, snap => {
    const list = snap.docs.map(d => d.data());
    const pending = snap.docs.filter(d => d.metadata.hasPendingWrites).length;
    cb(list, pending, snap.metadata.fromCache);
  }, e => console.warn('watchMyCases', e));
}

// Anonymous reports in one taluka (for the "outbreaks near you" alert).
export function watchTaluka(taluka, cb) {
  if (mode === 'local') return localWatch(c => c.taluka === taluka && shared(c), list => cb(list.map(reportOf)));
  if (mode === 'api') return poll(`/reports?taluka=${encodeURIComponent(taluka)}`, cb, 30000);
  const q = query(collection(db, 'reports'), where('taluka', '==', taluka));
  return onSnapshot(q, snap => cb(snap.docs.map(d => d.data())), e => console.warn('watchTaluka', e));
}

// Anonymous reports across the district (the outbreak map).
export function watchDistrict(cb) {
  if (mode === 'local') return localWatch(shared, list => cb(list.map(reportOf)));
  if (mode === 'api') return poll('/reports', cb, 30000);
  return onSnapshot(collection(db, 'reports'), snap => cb(snap.docs.map(d => d.data())), e => console.warn('watchDistrict', e));
}

// Every case in the district (staff views).
export function watchAllCases(cb) {
  if (mode === 'local') return localWatch(() => true, cb);
  if (mode === 'api') return poll('/staff/cases', cb, 5000);
  return onSnapshot(collection(db, 'cases'), snap => cb(snap.docs.map(d => d.data())),
    e => console.warn('watchAllCases', e));
}

// Today on the phone, "YYYY-MM-DD".
export function localDay(t = Date.now()) {
  const d = new Date(t), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// The week's care plan: which remedy steps the farmer did on which day, kept on the
// walk they belong to ({ care: { "YYYY-MM-DD": [step index, ...] } }). The strongest
// step done becomes the walk's `treatment`, which the next walk uses to tell whether
// it worked (and what worked for neighbours).
const TIER_RANK = { cultural: 1, mechanical: 2, biological: 3, chemical: 4 };
export function tickCare(c, index, step, done, day = localDay()) {
  const care = { ...(c.care || {}) };
  const today = new Set(care[day] || []);
  if (done) today.add(index); else today.delete(index);
  care[day] = [...today].sort((a, b) => a - b);
  const patch = { id: c.id, care };
  if (done && (TIER_RANK[step.tier] || 0) >= (TIER_RANK[c.treatment?.tier] || 0)) {
    patch.treatment = { tier: step.tier, product: step.product || null, at: Date.now() };
  }
  upsertCase(patch);
}

export async function decideCase(id, decision, staffEmail) {
  // decision: { status: 'confirmed' | 'corrected' | 'lab_referred', label?, note? }
  const patch = {
    status: decision.status,
    expert: { label: decision.label ?? null, by: staffEmail ?? 'expert', at: Date.now(), note: decision.note ?? null }
  };
  if (decision.status === 'corrected' && decision.label) patch.label = decision.label;
  if (mode === 'api') return api(`/staff/cases/${id}/decision`, { method: 'POST', body: decision });
  if (mode === 'local') {
    const list = localAll();
    const i = list.findIndex(x => x.id === id);
    if (i >= 0) { list[i] = { ...list[i], ...patch }; localSave(list); }
    return list[i];
  }
  // The report follows the verdict, but only for a case its farmer agreed to share.
  const snap = await getDoc(doc(db, 'cases', id));
  const b = writeBatch(db);
  b.update(doc(db, 'cases', id), patch);
  if (snap.exists() && shared(snap.data())) b.set(doc(db, 'reports', id), reportOf({ ...snap.data(), ...patch }), { merge: true });
  return b.commit();
}

// Sharing consent withdrawn (DPDP: revocable). This plot's walks stop being shared,
// and the reports already published from them come down, not just future ones.
// Walks from before plots existed belong to the first plot.
export async function withdrawShared(plotId, uid) {
  const first = getPlots()[0]?.id;
  const ofPlot = c => !c.seed && c.share === true && (c.plotId || first) === plotId;
  if (mode === 'local') {
    localSave(localAll().map(c => c.uid === uid && ofPlot(c) ? { ...c, share: false } : c));
    return;
  }
  if (mode === 'api') {
    // The server only serves reports for cases that are still shared.
    (await idb.all('cases')).filter(ofPlot).forEach(c => upsertCase({ id: c.id, share: false }));
    return;
  }
  const snap = await getDocs(query(collection(db, 'cases'), where('uid', '==', uid)));
  const list = snap.docs.map(d => d.data()).filter(ofPlot);
  for (let i = 0; i < list.length; i += 200) {
    const b = writeBatch(db);
    list.slice(i, i + 200).forEach(c => {
      b.update(doc(db, 'cases', c.id), { share: false });
      b.delete(doc(db, 'reports', c.id));
    });
    await b.commit();
  }
}

// Write many cases at once (demo seed data). Firestore batches max 500 writes.
export async function bulkWrite(cases) {
  if (mode === 'local') { localSave([...localAll(), ...cases]); return; }
  if (mode === 'api') { await api('/staff/seed', { method: 'POST', body: cases }); return; }
  // Two writes per case (case + report), so 200 cases per batch.
  for (let i = 0; i < cases.length; i += 200) {
    const b = writeBatch(db);
    cases.slice(i, i + 200).forEach(c => {
      b.set(doc(db, 'cases', c.id), c);
      b.set(doc(db, 'reports', c.id), { ...reportOf(c), seed: true });
    });
    await b.commit();
  }
}

export async function clearSeed() {
  if (mode === 'local') { localSave(localAll().filter(c => !c.seed)); return; }
  if (mode === 'api') { await api('/staff/seed', { method: 'DELETE' }); return; }
  for (const name of ['cases', 'reports']) {
    const snap = await getDocs(query(collection(db, name), where('seed', '==', true)));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const b = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
      await b.commit();
    }
  }
}

// ---------- SMS (sandbox gateway) ----------
// Every message the system sends — block risk alerts, expert replies, officer
// broadcasts, escalations — goes through here. With the API it goes to the
// server's SMS gateway (sandbox or a real provider); otherwise it lands in this
// browser's sandbox inbox (/sms).
const SMS = 'fr_sms';
export function sendSms({ to, text, kind, taluka }) {
  const m = { id: newId(), to, text, kind, taluka: taluka || null, at: Date.now(), gateway: 'sandbox' };
  if (mode === 'api') return api('/sms', { method: 'POST', body: m }).catch(e => console.warn('sms', e.message));
  writeLocal(SMS, [m, ...readLocal(SMS, [])].slice(0, 500)); notify(SMS);
  return Promise.resolve(m);
}
export function watchSms(cb) {
  if (mode === 'api') return poll('/sms/sandbox', cb, 3000);
  return listen(SMS, () => cb(readLocal(SMS, [])));
}

// Phone numbers registered for alerts: plots that agreed to SMS, plus numbers
// registered through the missed-call / IVR line.
const REG = 'fr_registrations';
export function registerPhone({ phone, taluka, crop, lang, via }) {
  if (mode === 'api') return api('/ivr/register', { method: 'POST', body: { phone, taluka, crop, lang, via } });
  const list = readLocal(REG, []).filter(r => r.phone !== phone);
  list.push({ phone, taluka, crop, lang, via, at: Date.now() });
  writeLocal(REG, list); notify(REG);
  return Promise.resolve();
}
export function registeredPhones(taluka) {
  const fromPlots = getPlots().filter(p => p.phone && p.smsConsent && (!taluka || p.taluka === taluka))
    .map(p => ({ phone: p.phone, lang: p.lang || 'mr', taluka: p.taluka, crop: p.crop }));
  const fromIvr = readLocal(REG, []).filter(r => !taluka || r.taluka === taluka);
  const seen = new Set();
  return [...fromPlots, ...fromIvr].filter(r => !seen.has(r.phone) && seen.add(r.phone));
}
export async function broadcast({ taluka, text, kind = 'broadcast' }) {
  if (mode === 'api') return api('/staff/broadcast', { method: 'POST', body: { taluka, text, kind } });
  const to = registeredPhones(taluka);
  for (const r of to) await sendSms({ to: r.phone, text, kind, taluka });
  return { sent: to.length };
}

// ---------- IVR / missed-call intake ----------
// A voice report from the IVR line becomes a case in the KVK queue with a call-back
// number and the transcript instead of a photo.
export function ivrReport({ phone, lang, crop, taluka, lat, lon, transcript }) {
  const c = {
    id: newId(), kind: 'ivr', uid: 'ivr:' + phone, phone, lang, crop, taluka, district: 'Wardha', lat, lon,
    transcript, status: 'pending_review', label: 'other', confidence: 0, top3: [], leafPct: 0,
    plantsInfected: 0, plantsWalked: 0, share: false, expert: null, createdAt: Date.now()
  };
  if (mode === 'api') return api('/ivr/calls', { method: 'POST', body: c });
  if (mode === 'local') { upsertCase(c); return Promise.resolve(c); }
  // The IVR is a server-side channel; Firestore rules rightly stop a browser from
  // filing a case for someone else's phone.
  return Promise.reject(new Error('The IVR line runs on the FasalRakshak server; use it with the API or in demo mode.'));
}

// ---------- API outbox: offline-first, idempotent sync ----------
const OUTBOX = 'fr_outbox_changed';
let syncing = false, again = false;
function queue(op) {
  const opId = newId(); // the idempotency key: the server applies each opId once
  idb.put('outbox', Date.now() + '-' + opId, { opId, ...op }).then(() => { notify(OUTBOX); flush(); });
}
async function flush() {
  if (!navigator.onLine || !getToken()) return;
  if (syncing) { again = true; return; } // run once more when this round ends
  syncing = true;
  try {
    const keys = (await idb.keys('outbox')).sort();
    for (let i = 0; i < keys.length; i += 20) {
      const slice = keys.slice(i, i + 20);
      const batch = await Promise.all(slice.map(k => idb.get('outbox', k)));
      const r = await api('/sync', { method: 'POST', body: { ops: batch } });
      const done = new Set(r.applied);
      await Promise.all(slice.filter((k, j) => done.has(batch[j].opId)).map(k => idb.del('outbox', k)));
      notify(OUTBOX);
    }
    // Pull the server's view of my cases: expert decisions and re-verification land here.
    // A case with changes still in the outbox keeps its phone copy until they land.
    const waiting = new Set((await Promise.all((await idb.keys('outbox')).map(k => idb.get('outbox', k))))
      .filter(op => op?.type === 'case').map(op => op.case.id));
    for (const c of await api('/cases/mine')) {
      if (waiting.has(c.id)) continue;
      const local = await idb.get('cases', c.id);
      await idb.put('cases', c.id, { ...(local || {}), ...c, photo: local?.photo || c.photo });
    }
    notify(CASES);
  } catch (e) { console.warn('sync', e.message); } finally {
    syncing = false;
    if (again) { again = false; flush(); }
  }
}
let started = false;
function startSync() {
  if (started) return; started = true;
  flush();
  window.addEventListener('online', flush);
  setInterval(flush, 20000);
}
