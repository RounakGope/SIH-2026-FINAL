// Demo data for the officer dashboard: ~190 past cases across Wardha's talukas,
// weighted so Arvi, Hinganghat and Samudrapur show as HIGH (matching slide 11),
// plus a few cases waiting for expert review. Re-run before every rehearsal.
import { TALUKAS, DISTRICT } from '../content/talukas';
import { newId } from '../lib/store';

const WEIGHTS = { Arvi: 40, Hinganghat: 45, Samudrapur: 38, Wardha: 20, Deoli: 12, Seloo: 14, Ashti: 8, Karanja: 10 };
const HOT = new Set(['Arvi', 'Hinganghat', 'Samudrapur']);
const LABELS = [['bacterial_blight', 0.45], ['jassid_damage', 0.35], ['leaf_curl', 0.1], ['healthy', 0.1]];
const ALL = ['healthy', 'bacterial_blight', 'leaf_curl', 'jassid_damage', 'other'];

function pickWeighted(pairs) {
  let r = Math.random();
  for (const [v, w] of pairs) { if ((r -= w) <= 0) return v; }
  return pairs[0][0];
}
function top3(label, conf) {
  const others = ALL.filter(l => l !== label).sort(() => Math.random() - 0.5);
  const rest = 1 - conf;
  return [{ label, p: +conf.toFixed(3) }, { label: others[0], p: +(rest * 0.7).toFixed(3) }, { label: others[1], p: +(rest * 0.2).toFixed(3) }];
}

export function makeSeed() {
  const now = Date.now();
  const out = [];
  for (const tk of TALUKAS) {
    const n = WEIGHTS[tk.name] || 10;
    for (let i = 0; i < n; i++) {
      // Hot talukas skew recent, so they cross the 14-day threshold.
      const ageDays = HOT.has(tk.name) ? Math.random() ** 1.6 * 28 : Math.random() * 28;
      const createdAt = Math.round(now - ageDays * 86400000);
      const label = pickWeighted(LABELS);
      const confidence = +(0.72 + Math.random() * 0.26).toFixed(3);
      const r = Math.random();
      const status = r < 0.5 ? 'confirmed' : r < 0.95 ? 'auto' : 'corrected';
      const plantsWalked = 10;
      const plantsInfected = label === 'healthy' ? 0 : 2 + Math.floor(Math.random() * 7);
      out.push({
        id: newId(), seed: true, uid: 'seed-farmer-' + Math.floor(Math.random() * 60),
        district: DISTRICT, taluka: tk.name, crop: 'Cotton', variety: 'Bt hybrid (BG-II)', acres: 1 + Math.floor(Math.random() * 5),
        cropDay: 60 + Math.floor(Math.random() * 30), stage: 'Boll formation',
        lat: +(tk.lat + (Math.random() - 0.5) * 0.12).toFixed(2), lon: +(tk.lon + (Math.random() - 0.5) * 0.12).toFixed(2),
        label, confidence, top3: top3(label, confidence),
        leafPct: label === 'healthy' ? 0 : +(5 + Math.random() * 35).toFixed(1), plantsInfected, plantsWalked,
        photo: null, createdAt, updatedAt: createdAt, modelVersion: 'seed', status,
        expert: status === 'auto' ? null : {
          label, by: 'kvk.wardha@demo', at: createdAt + Math.round((2 + Math.random() * 10) * 3600000), note: null
        }
      });
    }
  }
  // A few cases waiting for the expert right now.
  ['Hinganghat', 'Arvi', 'Deoli', 'Samudrapur', 'Seloo'].forEach((name, i) => {
    const tk = TALUKAS.find(x => x.name === name);
    const createdAt = now - (i + 1) * 3 * 3600000;
    const label = ALL[1 + (i % 3)];
    const confidence = +(0.42 + Math.random() * 0.2).toFixed(3);
    out.push({
      id: newId(), seed: true, uid: 'seed-farmer-p' + i, district: DISTRICT, taluka: name, crop: 'Cotton',
      variety: 'Bt hybrid (BG-II)', acres: 2, cropDay: 70, stage: 'Boll formation', lat: tk.lat, lon: tk.lon,
      label, confidence, top3: top3(label, confidence), leafPct: +(8 + Math.random() * 20).toFixed(1),
      plantsInfected: 3, plantsWalked: 10, photo: null, createdAt, updatedAt: createdAt, modelVersion: 'seed',
      status: 'pending_review', expert: null
    });
  });
  return out;
}
