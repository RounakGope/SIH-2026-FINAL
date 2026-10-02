import { useEffect, useState } from 'react';
import { useLang, LOCALE } from '../lib/i18n';
import { ipmFor, TIER_LABEL, CHEM_UNLOCK_INDEX } from '../content/ipm';
import { PRICE } from '../content/schemes';
import { areaLabel } from '../content/area';
import { evidencePdf } from '../lib/evidence';
import { tickCare, localDay } from '../lib/store';
import Schemes, { loadSchemeInputs, saveSchemeInputs } from './Schemes';

const DAY = 86400000;
const WEEK = 7; // a photo walk every week; the remedies are ticked off day by day in between

// Field severity index = % plants infected × average leaf severity ÷ 100.
export function fieldIndex(c) {
  if (!c.plantsWalked) return 0;
  return Math.round((c.plantsInfected / c.plantsWalked) * (c.leafPct || 0) * 10) / 10;
}

const EXAMPLE = {
  observed: [12, 17, 19, 15, 11, 8, 6, 5],
  projected: [12, 23, 38, 55, 70, 82, 90, 95]
};

export default function Progress({ farm, cases, goScan }) {
  const { t, pick } = useLang();
  const scans = cases.filter(c => c.plantsWalked);
  const real = scans.length >= 2;

  let observed, projected, labels;
  if (real) {
    const t0 = scans[0].createdAt;
    observed = scans.map(fieldIndex);
    const weeks = scans.map(c => (c.createdAt - t0) / (7 * DAY));
    const p0 = Math.max(2, observed[0]);
    // Untreated projection: logistic growth from the first scan (illustrative, r = 0.45/week).
    projected = weeks.map(w => Math.round(100 / (1 + ((100 - p0) / p0) * Math.exp(-0.45 * w))));
    labels = scans.map(c => new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
  } else {
    observed = EXAMPLE.observed; projected = EXAMPLE.projected;
    labels = observed.map((_, i) => 'Wk' + (i + 1));
  }
  const last = observed.length - 1;
  const gap = Math.max(0, projected[last] - observed[last]);
  // The farmer's usual yield prices the gap; the same figure the insurance section uses.
  const [version, setVersion] = useState(0);
  const inputs = loadSchemeInputs(farm.id);
  const setYield = y => { saveSchemeInputs(farm.id, { ...loadSchemeInputs(farm.id), yieldQPerAcre: y }); setVersion(n => n + 1); };
  const [making, setMaking] = useState(false);
  const makePdf = async () => { setMaking(true); try { await evidencePdf(farm, cases); } finally { setMaking(false); } };

  return (
    <main className="content">
      <div>
        <h2 className="h-title">{t('progTitle')}</h2>
        <p className="lead">{t('progLead')}</p>
      </div>

      <CarePlan latest={scans[scans.length - 1]} goScan={goScan} />

      <div className="chart-wrap">
        <Chart observed={observed} projected={projected} labels={labels} />
        <div className="legend">
          <span><i style={{ background: 'var(--color-accent-600)' }} />{t('untreated')}</span>
          <span><i style={{ background: 'var(--color-accent-2-700)' }} />{t('yourField')}</span>
        </div>
        <div className="small muted" style={{ marginTop: 4 }}>{t('severityIndex')} = % plants infected × leaf severity</div>
        {!real && <div className="small" style={{ marginTop: 4 }}><span className="todo">{t('exampleData')}</span></div>}
      </div>

      <Money farm={farm} yieldQ={inputs.yieldQPerAcre} gap={gap} untreated={projected[last]} real={real} onYield={setYield} />

      <section className="card">
        <h3>{t('history')}</h3>
        {scans.length === 0 ? <p className="small muted" style={{ margin: 0 }}>{t('noScans')}</p> : (
          <div className="hist" style={{ marginTop: 8 }}>
            {[...scans].reverse().map(c => (
              <div className="hist-item" key={c.id}>
                {c.photo ? <img src={c.photo} alt="" /> : <div className="ph" />}
                <div style={{ flex: 1 }}>
                  <b>{pick(ipmFor(c.label, c.crop).name)}</b> · {t('severityIndex').toLowerCase()} {fieldIndex(c)}
                  <div className="small muted">
                    {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {c.plantsInfected}/{c.plantsWalked} · {statusText(c, t)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card-light">
        <div className="section-h">{t('evidenceTitle')}</div>
        <p className="small" style={{ marginTop: 0 }}>{t('evidenceLead')}</p>
        <button className="btn-big" disabled={making || scans.length === 0} onClick={makePdf}>
          {making ? t('evidenceMaking') : '📄 ' + t('evidenceButton')}
        </button>
      </section>

      <Schemes farm={farm} cases={cases} gapPct={real ? gap : undefined} version={version} onChange={() => setVersion(n => n + 1)} />
    </main>
  );
}

const startOfDay = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

// This week's care plan: the remedies for the latest photo walk, ticked off each day
// they are done. After a week the farmer does a new walk, which adds the next point
// to the graph and brings a new plan.
function CarePlan({ latest, goScan }) {
  const { t, pick, lang } = useLang();
  const scanButton = <button className="btn-big" style={{ marginTop: 10 }} onClick={goScan}>📷 {t('scanNow')}</button>;
  const card = (body, footer) => (
    <section className="card">
      <h3 style={{ marginTop: 0 }}>{t('carePlanTitle')}</h3>
      {body}
      {footer}
    </section>
  );
  if (!latest) return card(<p className="small" style={{ margin: 0 }}>{t('careFirst')}</p>, scanButton);

  const start = startOfDay(latest.createdAt);
  const dayN = Math.round((startOfDay(Date.now()) - start) / DAY) + 1; // the walk's day is day 1
  const due = dayN > WEEK;
  const nextWalk = new Date(start + WEEK * DAY).toLocaleDateString(LOCALE[lang], { weekday: 'short', day: 'numeric', month: 'short' });
  const footer = due
    ? <><div className="banner" style={{ marginTop: 10 }}>{t('walkDue')}</div>{scanButton}</>
    : <div className="small muted" style={{ marginTop: 10 }}>{t('nextWalk', { d: nextWalk, n: WEEK + 1 - dayN })}</div>;

  const info = ipmFor(latest.label, latest.crop);
  // No plan without a firm diagnosis: the app doesn't prescribe below its confidence
  // threshold, so the farmer waits for the expert (or the lab) with interim advice.
  if (latest.status === 'pending_review') return card(<p className="small" style={{ margin: 0 }}>{t('careWaiting')}</p>, footer);
  if (latest.status === 'lab_referred') return card(<p className="small" style={{ margin: 0 }}>{t('careLab')}</p>, footer);
  if (!info.diseased) return card(<p className="small" style={{ margin: 0 }}>{t(latest.label === 'other' ? 'careRetake' : 'careHealthy')}</p>, footer);

  const chemOpen = !info.referLab && fieldIndex(latest) >= CHEM_UNLOCK_INDEX;
  const days = Array.from({ length: WEEK }, (_, i) => localDay(start + i * DAY));
  const today = localDay();
  const doneOn = (d, i) => (latest.care?.[d] || []).includes(i);
  return card(
    <>
      <p className="small muted" style={{ marginTop: 0 }}>
        <b>{pick(info.name)}</b> · {t('careDay', { n: Math.min(dayN, WEEK) })}. {t('careTick')}
      </p>
      <div className="ladder">
        {info.steps.map((s, i) => {
          const chem = s.tier === 'chemical';
          if (chem && !chemOpen) return (
            <div key={i} className="rung chem locked">
              <span className="n">{i + 1}</span>
              <div className="t"><b>{pick(TIER_LABEL[s.tier])}</b>{t('lockedChem')}</div>
            </div>
          );
          return (
            <label key={i} className={'rung care' + (chem ? ' chem' : '')}>
              <input type="checkbox" checked={doneOn(today, i)} onChange={e => tickCare(latest, i, s, e.target.checked)}
                aria-label={t('doneToday') + ': ' + pick(TIER_LABEL[s.tier])} />
              <div className="t">
                <b>{pick(TIER_LABEL[s.tier])}</b>
                {chem ? <Txt s={s.product} /> : pick(s.text)}
                <div className="dots" title={t('careDots')}>
                  {days.map(d => <i key={d} className={(doneOn(d, i) ? 'on' : '') + (d === today ? ' today' : '')} />)}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </>,
    footer
  );
}

// What following the remedies is worth: the gap between the untreated projection and
// the field, priced at MSP with the farmer's own usual yield.
function Money({ farm, yieldQ, gap, untreated, real, onYield }) {
  const { t, lang } = useLang();
  const price = PRICE[farm.crop];
  if (!price) return null;
  const [text, setText] = useState(yieldQ ?? '');
  useEffect(() => { if (+text !== yieldQ) setText(yieldQ ?? ''); }, [yieldQ]); // changed in the dropdown
  const value = yieldQ > 0 ? yieldQ * farm.acres * price.rs : null;
  const rs = n => value == null ? '—' : '₹' + Math.round(value * n / 100).toLocaleString('en-IN');
  return (
    <section className="saved-card money">
      <div className="small caps">{t('moneyTitle')}</div>
      <div className="money-row"><span>{t('moneySaved')}</span><b>{rs(gap)}</b></div>
      <div className="money-row"><span>{t('moneyAtRisk')}</span><b>{rs(untreated)}</b></div>
      <label className="money-yield">
        <span className="small">{t('yieldAsk')}</span>
        <input className="input" type="number" inputMode="decimal" min="0" placeholder="5" value={text}
          onChange={e => { setText(e.target.value); onYield(e.target.value === '' ? undefined : +e.target.value); }} />
      </label>
      <div className="small" style={{ opacity: .85, marginTop: 6 }}>
        {value == null ? t('moneyNeedYield') : t('moneyBasis', { a: areaLabel(farm, lang), p: price.rs.toLocaleString('en-IN') })}
        {real ? '' : ' ' + t('moneyExample')}
      </div>
    </section>
  );
}

function Txt({ s }) {
  if (!s) return null;
  return s.startsWith('TODO') ? <span className="todo">{s}</span> : <>{s}</>;
}

function statusText(c, t) {
  const key = { auto: 'stOnDevice', pending_review: 'stPending', confirmed: 'stConfirmed', corrected: 'stCorrected', lab_referred: 'stLab' }[c.status];
  return key ? t(key) : '';
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
