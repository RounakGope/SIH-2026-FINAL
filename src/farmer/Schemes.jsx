import { useEffect, useState } from 'react';
import { useLang, LOCALE } from '../lib/i18n';
import { ipmFor } from '../content/ipm';
import { schemeMaths, nextDeadline, SOURCES } from '../content/schemes';
import { areaLabel } from '../content/area';

const KEY = 'fr_scheme_inputs';
// What the farmer typed, per plot. My Progress reads the usual yield from here too.
export const loadSchemeInputs = id => { try { return JSON.parse(localStorage.getItem(KEY))?.[id] || {}; } catch { return {}; } };
export const saveSchemeInputs = (id, v) => { try { const all = JSON.parse(localStorage.getItem(KEY)) || {}; all[id] = v; localStorage.setItem(KEY, JSON.stringify(all)); } catch {} };
const rs = n => '₹' + Math.round(n).toLocaleString('en-IN');

// The money side of a diagnosis: insurance, the remedy's cost, the crop's value
// at MSP, and subsidies. Rates are published ones; the farmer types in what only
// they know (sum insured, shop price, yield).
export default function Schemes({ farm, cases, gapPct, version, onChange }) {
  const { t, pick, lang } = useLang();
  const [v, setV] = useState(() => loadSchemeInputs(farm.id));
  useEffect(() => { setV(loadSchemeInputs(farm.id)); }, [farm.id, version]);
  const set = patch => { const n = { ...v, ...patch }; setV(n); saveSchemeInputs(farm.id, n); onChange?.(n); };

  // The chemical step for the latest diagnosed disease, sized for this farm.
  const latest = [...cases].reverse().find(c => ipmFor(c.label, c.crop).diseased);
  const step = latest && ipmFor(latest.label, latest.crop).steps.find(s => s.tier === 'chemical' && !s.spot);
  const remedy = step && { product: step.product, unit: step.unit || 'g', qty: step.perTank * step.tanksPerAcre * farm.acres };
  const m = schemeMaths(farm, remedy, { ...v, lossAvoidedPct: v.lossAvoidedPct ?? gapPct });
  const due = nextDeadline(farm.crop);

  const num = (key, label, ph) => (
    <label className="field" style={{ display: 'block' }}>
      <span className="small">{label}</span>
      <input className="input num-in" type="number" inputMode="decimal" min="0" placeholder={ph}
        value={v[key] ?? ''} onChange={e => set({ [key]: e.target.value === '' ? undefined : +e.target.value })} />
    </label>
  );

  // Collapsed until the farmer opens it: most visits don't need the money side.
  return (
    <details className="card">
      <summary style={{ cursor: 'pointer' }}><h3 style={{ display: 'inline', margin: 0 }}>{t('schemesTitle')}</h3></summary>
      <div style={{ marginTop: 12 }} />

      {due && (
        <div className="deadline-banner">
          <b>{pick(due.label)}</b>: {due.when.toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long' })} · {t('daysLeft', { n: due.days })}
          <div className="small muted">{t('deadlineNote')}</div>
          {'Notification' in window && Notification.permission !== 'granted' && due.days <= 60 && (
            <button className="btn-line btn-sm" style={{ marginTop: 6 }} onClick={() => Notification.requestPermission()}>{t('remindMe')}</button>
          )}
        </div>
      )}

      <div className="section-h" style={{ marginTop: 14 }}>PMFBY · {t('cropInsurance')}</div>
      <p className="small" style={{ marginTop: 0 }}>{t('pmfbyShare', { s: m.pmfby?.share, why: m.pmfby?.why })}</p>
      {num('sumInsuredPerHa', t('sumInsuredPerHa'), t('askBank'))}
      {m.pmfby?.premium != null && <p className="small"><b>{t('yourPremium', { p: rs(m.pmfby.premium), s: rs(m.pmfby.sumInsured), ha: m.ha })}</b></p>}

      {m.remedy && (
        <>
          <div className="section-h" style={{ marginTop: 14 }}>{t('remedyCost')}</div>
          <p className="small" style={{ marginTop: 0 }}>{t('remedyQty', { q: formatQty(m.remedy.qty, m.remedy.unit), p: m.remedy.product.split(' (')[0].split(' —')[0], a: areaLabel(farm, lang) })}</p>
          {num('remedyPricePerKgL', t(m.remedy.unit === 'ml' ? 'pricePerL' : 'pricePerKg'), t('fromShop'))}
          {m.remedy.cost != null && (
            <p className="small"><b>{t('remedyTotal', { c: rs(m.remedy.cost) })}</b> {t('noChemSubsidy')}</p>
          )}
          <label className="check"><input type="checkbox" checked={!!v.borrowOnKcc} onChange={e => set({ borrowOnKcc: e.target.checked })} /><span>{t('kccBorrow')}</span></label>
          {m.kcc && <p className="small">{t('kccCost', { i: rs(m.kcc.interest6m) })}</p>}
        </>
      )}

      {m.price && (
        <>
          <div className="section-h" style={{ marginTop: 14 }}>{t('cropValue')}</div>
          {num('yieldQPerAcre', t('yieldPerAcre'), t('lastSeason'))}
          {m.cropValue != null && (
            <p className="small">
              <b>{rs(m.cropValue)}</b> {t('atMsp', { p: rs(m.price.rs), basis: m.price.basis })}
              {m.lossAvoided != null && <><br /><b>{rs(m.lossAvoided)}</b> {t('lossAvoidedIs', { pct: Math.round(v.lossAvoidedPct ?? gapPct) })}</>}
            </p>
          )}
        </>
      )}

      <div className="section-h" style={{ marginTop: 14 }}>SMAM · {t('sprayerSubsidy')}</div>
      <p className="small" style={{ marginTop: 0 }}>{t(m.smam.smallMarginal ? 'smamSmall' : 'smamOther', { r: m.smam.rate })}</p>
      <label className="check"><input type="checkbox" checked={!!v.scStWomen} onChange={e => set({ scStWomen: e.target.checked })} /><span>{t('scStWomen')}</span></label>
      {num('sprayerPrice', t('sprayerPrice'), t('fromShop'))}
      {m.smam.subsidy != null && <p className="small"><b>{t('smamResult', { s: rs(m.smam.subsidy), p: rs(m.smam.youPay) })}</b></p>}

      <div className="section-h" style={{ marginTop: 14 }}>PM-KISAN</div>
      <p className="small" style={{ marginTop: 0 }}>{t('pmkisan')}</p>
      <p className="small">{t('mahadbt')} <a href="https://mahadbt.maharashtra.gov.in" target="_blank" rel="noreferrer">mahadbt.maharashtra.gov.in</a></p>

      <details className="small muted"><summary>{t('sources')}</summary>
        <ul style={{ paddingLeft: 18 }}>{Object.values(SOURCES).map(s => <li key={s}>{s}</li>)}</ul>
      </details>
    </details>
  );
}

function formatQty(q, unit) {
  return q >= 1000 ? `${(q / 1000).toFixed(2)} ${unit === 'ml' ? 'L' : 'kg'}` : `${Math.round(q)} ${unit}`;
}
