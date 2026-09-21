import { useLang } from '../lib/i18n';
import { ipmFor, ECONOMICS } from '../content/ipm';

// Field severity index = % plants infected × average leaf severity ÷ 100.
export function fieldIndex(c) {
  if (!c.plantsWalked) return 0;
  return Math.round((c.plantsInfected / c.plantsWalked) * (c.leafPct || 0) * 10) / 10;
}

const EXAMPLE = {
  observed: [12, 17, 19, 15, 11, 8, 6, 5],
  projected: [12, 23, 38, 55, 70, 82, 90, 95]
};

export default function Progress({ farm, cases }) {
  const { t, pick, lang } = useLang();
  const scans = cases.filter(c => c.plantsWalked);
  const real = scans.length >= 2;

  let observed, projected, labels;
  if (real) {
    const t0 = scans[0].createdAt;
    observed = scans.map(fieldIndex);
    const weeks = scans.map(c => (c.createdAt - t0) / (7 * 86400000));
    const p0 = Math.max(2, observed[0]);
    // Untreated projection: logistic growth from the first scan (illustrative, r = 0.45/week).
    projected = weeks.map(w => Math.round(100 / (1 + ((100 - p0) / p0) * Math.exp(-0.45 * w))));
    labels = scans.map(c => new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
  } else {
    observed = EXAMPLE.observed; projected = EXAMPLE.projected;
    labels = observed.map((_, i) => 'Wk' + (i + 1));
  }
  const gap = projected[projected.length - 1] - observed[observed.length - 1];
  const kept = observed[0] < 1 ? 0 : Math.max(0, Math.round((farm.acres * ECONOMICS.valueProtectedPerAcre * gap) / 100));

  return (
    <main className="content">
      <div>
        <h2 className="h-title">{t('progTitle')}</h2>
        <p className="lead">{t('progLead')}</p>
      </div>

      <div className="chart-wrap">
        <Chart observed={observed} projected={projected} labels={labels} />
        <div className="legend">
          <span><i style={{ background: 'var(--color-accent-600)' }} />{t('untreated')}</span>
          <span><i style={{ background: 'var(--color-accent-2-700)' }} />{t('yourField')}</span>
        </div>
        <div className="small muted" style={{ marginTop: 4 }}>{t('severityIndex')} = % plants infected × leaf severity</div>
        {!real && <div className="small" style={{ marginTop: 4 }}><span className="todo">{t('exampleData')}</span></div>}
      </div>

      <div className="saved-card">
        <div className="small" style={{ opacity: .85, letterSpacing: '.08em', textTransform: 'uppercase' }}>
          {lang === 'mr' ? 'फरक, बाजारभावाने' : 'The gap, priced at the mandi rate'}</div>
        <b>₹{kept.toLocaleString('en-IN')}</b>
        <div className="small">{lang === 'mr' ? `${farm.acres} एकरवर वाचवलेले उत्पन्न` : `of yield kept on ${farm.acres} acres`} · {t('illustrative')}</div>
      </div>

      <section className="card">
        <h3>{t('history')}</h3>
        {scans.length === 0 ? <p className="small muted" style={{ margin: 0 }}>{t('noScans')}</p> : (
          <div className="hist" style={{ marginTop: 8 }}>
            {[...scans].reverse().map(c => (
              <div className="hist-item" key={c.id}>
                {c.photo ? <img src={c.photo} alt="" /> : <div className="ph" />}
                <div style={{ flex: 1 }}>
                  <b>{pick(ipmFor(c.label).name)}</b> · {t('severityIndex').toLowerCase()} {fieldIndex(c)}
                  <div className="small muted">
                    {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {c.plantsInfected}/{c.plantsWalked} · {statusText(c, lang)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function statusText(c, lang) {
  const m = {
    auto: ['on-device', 'फोनवर'], pending_review: ['waiting for expert', 'तज्ञांकडे'],
    confirmed: ['expert-confirmed', 'तज्ञांनी खात्री केली'], corrected: ['expert-corrected', 'तज्ञांनी दुरुस्त केले'],
    lab_referred: ['lab sample asked', 'प्रयोगशाळा नमुना']
  }[c.status] || ['', ''];
  return lang === 'mr' ? m[1] : m[0];
}

function Chart({ observed, projected, labels }) {
  const W = 340, H = 190, L = 28, R = 10, T = 12, B = 24;
  const n = observed.length;
  const x = i => L + (n === 1 ? 0 : (i / (n - 1)) * (W - L - R));
  const y = v => T + (1 - v / 100) * (H - T - B);
  const line = arr => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = line(projected) + ' ' + [...observed].reverse().map((v, j) => `L${x(n - 1 - j).toFixed(1)},${y(v).toFixed(1)}`).join(' ') + ' Z';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Severity over time">
      {[0, 50, 100].map(v => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--color-neutral-300)" strokeDasharray={v ? '3 4' : ''} />
          <text x={L - 6} y={y(v) + 4} fontSize="10" textAnchor="end" fill="var(--color-neutral-700)">{v}</text>
        </g>
      ))}
      <path d={area} fill="var(--color-accent-300)" opacity=".45" />
      <path d={line(projected)} fill="none" stroke="var(--color-accent-600)" strokeWidth="2.5" strokeDasharray="7 5" />
      <path d={line(observed)} fill="none" stroke="var(--color-accent-2-700)" strokeWidth="3" />
      {observed.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="4" fill="var(--color-accent-2-700)" />)}
      {labels.map((l, i) => (n <= 8 || i % Math.ceil(n / 8) === 0) && (
        <text key={i} x={x(i)} y={H - 6} fontSize="10" textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fill="var(--color-neutral-700)">{l}</text>
      ))}
    </svg>
  );
}
