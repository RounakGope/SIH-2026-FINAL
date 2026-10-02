// Evidence pack: a dated, geotagged PDF of a plot's scans for loss assessment,
// grievance appeals and state relief applications. Built on the phone, offline.
//
// Scope, stated in the pack itself: PMFBY settles pest and disease losses through
// Crop Cutting Experiment yield data, without individual intimation. The pack does
// not file a claim; it gives the farmer the record an assessor or appeal asks for.
import { jsPDF } from 'jspdf';
import { ipmFor } from '../content/ipm';
import { cropDay, sowMonthLabel } from '../content/rules';
import { areaLabel } from '../content/area';

const fmtDate = ms => new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const STATUS = { auto: 'On-device result', pending_review: 'Waiting for KVK expert', confirmed: 'Confirmed by KVK expert', corrected: 'Corrected by KVK expert', lab_referred: 'Lab sample requested' };

async function fingerprint(data) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(data)));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function evidencePdf(farm, cases) {
  const walks = cases.filter(c => c.plantsWalked).sort((a, b) => a.createdAt - b.createdAt);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 16;
  let y = M;
  const line = (text, size = 10, style = 'normal', gap = 5.2) => {
    pdf.setFont('helvetica', style); pdf.setFontSize(size);
    for (const l of pdf.splitTextToSize(String(text), W - 2 * M)) { if (y > 280) { pdf.addPage(); y = M; } pdf.text(l, M, y); y += gap; }
  };
  const rule = () => { pdf.setDrawColor(200); pdf.line(M, y, W - M, y); y += 5; };

  line('FasalRakshak — crop damage evidence pack', 16, 'bold', 8);
  line(`Generated ${fmtDate(Date.now())}`, 9);
  rule();

  line('Plot', 12, 'bold', 6);
  line(`Crop: ${farm.crop}, sown ${sowMonthLabel(farm.sowDate) || 'month not given'}, day ${cropDay(farm.sowDate)} today`);
  const ha = (farm.acres * 0.4047).toFixed(2);
  const inAcres = farm.areaUnit && farm.areaUnit !== 'acre' ? `${(+farm.acres).toFixed(2)} acres, ` : '';
  line(`Area: ${areaLabel(farm)} (${inAcres}${ha} ha) · Taluka ${farm.taluka}, District Wardha`);
  line(`Location: ${(+farm.lat).toFixed(2)}° N, ${(+farm.lon).toFixed(2)}° E (rounded to about 1 km)`);
  rule();

  const last = walks[walks.length - 1];
  line('Summary', 12, 'bold', 6);
  if (!last) line('No scans recorded yet.');
  else {
    const infectedShare = last.plantsInfected / last.plantsWalked;
    const diseases = [...new Set(walks.filter(w => ipmFor(w.label, w.crop).diseased).map(w => ipmFor(w.label, w.crop).name.en))];
    line(`${walks.length} field walk${walks.length > 1 ? 's' : ''} from ${fmtDate(walks[0].createdAt)} to ${fmtDate(last.createdAt)}.`);
    line(`Diagnoses: ${diseases.join(', ') || 'none'}. Expert-checked walks: ${walks.filter(w => ['confirmed', 'corrected', 'lab_referred'].includes(w.status)).length}.`);
    line(`Latest walk: ${last.plantsInfected} of ${last.plantsWalked} plants infected, average leaf area affected ${last.leafPct}%, field severity index ${last.sevIndex ?? '—'}.`);
    line(`Estimated area affected: ${(farm.acres * infectedShare).toFixed(2)} acres (plot area × share of plants infected on the latest walk).`);
  }
  rule();

  line('Timeline', 12, 'bold', 6);
  for (const w of walks) {
    const info = ipmFor(w.label, w.crop);
    const verdict = w.expert ? `${STATUS[w.status]} (${w.expert.by}, ${fmtDate(w.expert.at)})` : STATUS[w.status] || w.status;
    line(`${fmtDate(w.createdAt)} — ${info.name.en}, ${Math.round((w.confidence || 0) * 100)}% confidence · ${w.plantsInfected}/${w.plantsWalked} plants · leaf ${w.leafPct}% · index ${w.sevIndex ?? '—'}`, 10, 'bold');
    line(`   ${verdict}${w.treatment ? ` · treatment applied: ${w.treatment.tier}${w.treatment.product ? ' (' + w.treatment.product.split(' (')[0] + ')' : ''} on ${fmtDate(w.treatment.at)}` : ''}`, 9);
  }
  rule();

  // Severity over time.
  const pts = walks.filter(w => w.sevIndex != null);
  if (pts.length >= 2) {
    line('Field severity index over time', 12, 'bold', 6);
    const h = 40, x0 = M + 8, x1 = W - M, y0 = y + h;
    if (y0 > 280) { pdf.addPage(); y = M; }
    const max = Math.max(10, ...pts.map(p => p.sevIndex));
    pdf.setDrawColor(150); pdf.line(x0, y, x0, y + h); pdf.line(x0, y + h, x1, y + h);
    pdf.setFontSize(8); pdf.text(String(Math.round(max)), M, y + 3); pdf.text('0', M + 4, y + h);
    pdf.setDrawColor(122, 138, 94); pdf.setLineWidth(0.8);
    const X = i => x0 + (i / (pts.length - 1)) * (x1 - x0 - 4), Y = v => y + h - (v / max) * h;
    for (let i = 1; i < pts.length; i++) pdf.line(X(i - 1), Y(pts[i - 1].sevIndex), X(i), Y(pts[i].sevIndex));
    pdf.setLineWidth(0.2);
    y += h + 8;
  }

  // Photos, dated and geotagged.
  const withPhotos = walks.filter(w => w.photo);
  if (withPhotos.length) {
    pdf.addPage(); y = M;
    line('Photographs (as captured on the phone)', 12, 'bold', 7);
    let col = 0;
    for (const w of withPhotos) {
      if (y > 230) { pdf.addPage(); y = M; }
      const x = M + col * 92;
      try { pdf.addImage(w.photo, 'JPEG', x, y, 84, 84); } catch { /* skip an unreadable photo */ }
      pdf.setFontSize(8);
      pdf.text(`${fmtDate(w.createdAt)} · ${(+w.lat).toFixed(2)}°N ${(+w.lon).toFixed(2)}°E`, x, y + 89);
      pdf.text(`${ipmFor(w.label, w.crop).name.en} · leaf ${w.leafPct}%`, x, y + 93);
      col = 1 - col; if (col === 0) y += 100;
    }
    if (col === 1) y += 100;
  }

  // Scope note and tamper-evidence.
  if (y > 250) { pdf.addPage(); y = M; }
  rule();
  line('About this pack', 11, 'bold', 6);
  line('Under PMFBY, pest and disease damage is settled through Crop Cutting Experiment yield data, without individual intimation. This pack does not file a claim; it is the dated, geotagged record an assessor, a grievance appeal or a state relief application asks for. Diagnoses marked "on-device" are the app\'s own, those marked by a KVK expert were checked by one.', 9);
  const hash = await fingerprint(walks.map(w => ({ id: w.id, t: w.createdAt, l: w.label, c: w.confidence, s: w.sevIndex, st: w.status, e: w.expert })));
  line(`Record fingerprint (SHA-256): ${hash}`, 8);
  line('Any change to the dates, diagnoses or expert decisions above changes this fingerprint.', 8);

  const d = new Date(), local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  pdf.save(`FasalRakshak-evidence-${farm.crop}-${local}.pdf`);
}
