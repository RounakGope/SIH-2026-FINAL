// District officer's tools, computed from the case list (same on every backend).
import JSZip from 'jszip';
import { ipmFor, TANKS_PER_ACRE, TANK_L } from '../content/ipm';
import { countsForAlert } from '../content/rules';
import { TALUKAS } from '../content/talukas';

const DAY = 86400000;
export const ESCALATE_AFTER_H = 24; // response-time clock: unanswered cases go to the officer

export const hoursWaiting = c => (Date.now() - c.createdAt) / 3600000;
export const isEscalated = c => c.status === 'pending_review' && hoursWaiting(c) >= ESCALATE_AFTER_H;

// Area affected on a case: plot acres × share of walked plants infected.
const affectedAcres = c => (c.acres || 0) * (c.plantsWalked ? c.plantsInfected / c.plantsWalked : 0);

// Bio-inputs for one application round, per taluka, from the doses in the IPM
// content: neem oil 5 ml/L and NSKE 5% (50 g/L) at the ICAR spray volume, and
// Trichoderma / Pseudomonas at 2.5 kg/ha for chickpea wilt patches.
const SPRAY_L_PER_ACRE = TANKS_PER_ACRE * TANK_L;
export function bioInputPlan(cases, days = 14) {
  const since = Date.now() - days * DAY;
  return TALUKAS.map(tk => {
    const rows = cases.filter(c => c.taluka === tk.name && c.createdAt >= since && countsForAlert(c));
    let neemAcres = 0, wiltHa = 0, acres = 0;
    for (const c of rows) {
      const a = affectedAcres(c); acres += a;
      const bio = ipmFor(c.label, c.crop).steps.find(s => s.tier === 'biological');
      const text = bio?.text?.en || '';
      if (/neem oil/i.test(text)) neemAcres += a;
      if (/2\.5 kg per hectare/i.test(text)) wiltHa += a * 0.4047;
    }
    return {
      taluka: tk.name, cases: rows.length, acres: Math.round(acres * 10) / 10,
      neemOilL: Math.round(neemAcres * SPRAY_L_PER_ACRE * 5 / 1000 * 10) / 10,   // 5 ml per litre of spray
      nskeKg: Math.round(neemAcres * SPRAY_L_PER_ACRE * 50 / 1000),               // 5% = 50 g per litre
      trichodermaKg: Math.round(wiltHa * 2.5 * 10) / 10                          // 2.5 kg per hectare
    };
  }).filter(r => r.cases > 0).sort((a, b) => b.acres - a.acres);
}

// A week of expert-checked and confident cases for CROPSAP / NPSS. Neither system
// publishes an import API; this is a flat CSV with the fields their survey forms
// ask for, location rounded to ~10 km.
export function surveillanceCsv(cases, days = 7) {
  const since = Date.now() - days * DAY;
  const rows = cases.filter(c => c.createdAt >= since && countsForAlert(c)).sort((a, b) => a.createdAt - b.createdAt);
  const head = ['date', 'district', 'taluka', 'crop', 'crop_stage', 'crop_day', 'pest_or_disease', 'plants_infected', 'plants_observed',
    'leaf_severity_pct', 'field_severity_index', 'status', 'confirmed_by', 'lat_10km', 'lon_10km', 'source_record'];
  const esc = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = rows.map(c => [
    new Date(c.createdAt).toISOString().slice(0, 10), c.district || 'Wardha', c.taluka, c.crop, c.stage, c.cropDay,
    ipmFor(c.label, c.crop).name.en, c.plantsInfected, c.plantsWalked, c.leafPct, c.sevIndex ?? '',
    c.status, c.expert?.by || '', (+c.lat).toFixed(1), (+c.lon).toFixed(1), 'FasalRakshak:' + c.id
  ].map(esc).join(','));
  return { csv: [head.join(','), ...lines].join('\n'), count: rows.length };
}

// Expert-confirmed labels as a training set for the next model version:
// images/<crop>/<label>/<id>.jpg plus labels.csv with what the model had said.
export async function trainingZip(cases) {
  const rows = cases.filter(c => ['confirmed', 'corrected'].includes(c.status) && c.photo && !c.seed);
  const zip = new JSZip();
  const csv = ['id,crop,label,model_label,model_confidence,decided_by,decided_at,taken_at'];
  for (const c of rows) {
    const modelLabel = c.top3?.[0]?.label ?? '';
    zip.file(`images/${c.crop.toLowerCase()}/${c.label}/${c.id}.jpg`, c.photo.split(',')[1], { base64: true });
    csv.push([c.id, c.crop.toLowerCase(), c.label, modelLabel, c.top3?.[0]?.p ?? '', c.expert?.by ?? '',
      c.expert?.at ? new Date(c.expert.at).toISOString() : '', new Date(c.createdAt).toISOString()].join(','));
  }
  zip.file('labels.csv', csv.join('\n'));
  zip.file('README.txt', 'Expert-checked field photos from FasalRakshak. Folder = the expert\'s label; labels.csv also records what the on-device model said, so disagreements can be weighted when retraining.\n');
  return { blob: await zip.generateAsync({ type: 'blob' }), count: rows.length };
}

export function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
