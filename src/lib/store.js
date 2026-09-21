// One data API for the whole app. Uses Firestore when Firebase is configured,
// otherwise localStorage ("local demo mode", data stays in this browser).
//
// A "case" is one field scan (a 10-plant walk). Shape:
// { id, uid, district, taluka, crop, cropDay, stage, lat, lon, label, confidence,
//   top3: [{label, p}], leafPct, plantsInfected, plantsWalked, photo, status,
//   expert: {label, by, at, note} | null, createdAt (ms), seed? }
// status: 'auto' | 'pending_review' | 'confirmed' | 'corrected' | 'lab_referred'
import { firebaseEnabled, db, auth } from './firebase';
import {
  collection, doc, setDoc, updateDoc, onSnapshot, query, where, writeBatch, getDocs
} from 'firebase/firestore';
import {
  onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut
} from 'firebase/auth';

export const mode = firebaseEnabled ? 'firebase' : 'local';

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

// ---------- farm profile (always kept on the device too) ----------
export function getFarm() { return readLocal('fr_farm', null); }
export function saveFarm(farm, uid) {
  writeLocal('fr_farm', farm);
  if (firebaseEnabled && uid) {
    setDoc(doc(db, 'farms', uid), { ...farm, updatedAt: Date.now() }, { merge: true })
      .catch(e => console.warn('farm sync', e));
  }
}

// ---------- auth ----------
// Farmers: anonymous sign-in (needs network once; afterwards it persists offline).
export function initFarmer(cb) {
  if (!firebaseEnabled) {
    let uid = readLocal('fr_uid', null);
    if (!uid) { uid = 'local-' + newId(); writeLocal('fr_uid', uid); }
    cb({ uid, anonymous: true });
    return () => {};
  }
  return onAuthStateChanged(auth, user => {
    if (user) cb({ uid: user.uid, anonymous: user.isAnonymous, email: user.email });
    else signInAnonymously(auth).catch(e => { console.warn('anon sign-in', e); cb(null); });
  });
}

// Staff (expert / officer): email + password created in the Firebase console.
export function watchStaff(cb) {
  if (!firebaseEnabled) { cb({ uid: 'local-staff', email: 'demo@local' }); return () => {}; }
  return onAuthStateChanged(auth, user => cb(user && !user.isAnonymous ? { uid: user.uid, email: user.email } : null));
}
export function staffLogin(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}
export function staffLogout() { return firebaseEnabled ? signOut(auth) : Promise.resolve(); }

// ---------- cases: local backend ----------
const LKEY = 'fr_cases';
const listeners = new Set();
function localAll() { return readLocal(LKEY, []); }
function localSave(list) {
  writeLocal(LKEY, list);
  listeners.forEach(fn => fn());
}
if (typeof window !== 'undefined') {
  // Lets a farmer tab and a staff tab in the same browser see each other's changes.
  window.addEventListener('storage', e => { if (e.key === LKEY) listeners.forEach(fn => fn()); });
}
function localWatch(filter, cb) {
  const run = () => cb(localAll().filter(filter), 0);
  listeners.add(run); run();
  return () => listeners.delete(run);
}

// ---------- cases: public API ----------
// Save or update a case. Never await this in the UI: with Firestore offline the
// promise only resolves once the server has it, but the write is already safe
// in the local cache and will upload by itself.
export function upsertCase(c) {
  if (!firebaseEnabled) {
    const list = localAll();
    const i = list.findIndex(x => x.id === c.id);
    if (i >= 0) list[i] = { ...list[i], ...c }; else list.push(c);
    localSave(list);
    return;
  }
  setDoc(doc(db, 'cases', c.id), c, { merge: true }).catch(e => console.warn('case sync', e));
}

// Farmer's own cases + how many are still waiting to upload.
export function watchMyCases(uid, cb) {
  if (!firebaseEnabled) return localWatch(c => c.uid === uid, cb);
  const q = query(collection(db, 'cases'), where('uid', '==', uid));
  return onSnapshot(q, { includeMetadataChanges: true }, snap => {
    const list = snap.docs.map(d => d.data());
    const pending = snap.docs.filter(d => d.metadata.hasPendingWrites).length;
    cb(list, pending, snap.metadata.fromCache);
  }, e => console.warn('watchMyCases', e));
}

// Cases in one taluka (for the "outbreaks near you" alert).
export function watchTaluka(taluka, cb) {
  if (!firebaseEnabled) return localWatch(c => c.taluka === taluka, cb);
  const q = query(collection(db, 'cases'), where('taluka', '==', taluka));
  return onSnapshot(q, snap => cb(snap.docs.map(d => d.data())), e => console.warn('watchTaluka', e));
}

// Every case in the district (staff views).
export function watchAllCases(cb) {
  if (!firebaseEnabled) return localWatch(() => true, cb);
  return onSnapshot(collection(db, 'cases'), snap => cb(snap.docs.map(d => d.data())),
    e => console.warn('watchAllCases', e));
}

export function decideCase(id, decision, staffEmail) {
  // decision: { status: 'confirmed' | 'corrected' | 'lab_referred', label?, note? }
  const patch = {
    status: decision.status,
    expert: { label: decision.label ?? null, by: staffEmail ?? 'expert', at: Date.now(), note: decision.note ?? null }
  };
  if (decision.status === 'corrected' && decision.label) patch.label = decision.label;
  if (!firebaseEnabled) {
    const list = localAll();
    const i = list.findIndex(x => x.id === id);
    if (i >= 0) { list[i] = { ...list[i], ...patch }; localSave(list); }
    return Promise.resolve();
  }
  return updateDoc(doc(db, 'cases', id), patch);
}

// Write many cases at once (demo seed data). Firestore batches max 500 writes.
export async function bulkWrite(cases) {
  if (!firebaseEnabled) { localSave([...localAll(), ...cases]); return; }
  for (let i = 0; i < cases.length; i += 400) {
    const b = writeBatch(db);
    cases.slice(i, i + 400).forEach(c => b.set(doc(db, 'cases', c.id), c));
    await b.commit();
  }
}

export async function clearSeed() {
  if (!firebaseEnabled) { localSave(localAll().filter(c => !c.seed)); return; }
  const snap = await getDocs(query(collection(db, 'cases'), where('seed', '==', true)));
  for (let i = 0; i < snap.docs.length; i += 400) {
    const b = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
    await b.commit();
  }
}
