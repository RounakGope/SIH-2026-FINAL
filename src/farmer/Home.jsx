import { useEffect, useState } from 'react';
import { useLang, LOCALE } from '../lib/i18n';
import { evaluateRisks, cropDay, PBW_ETL, cropName } from '../content/rules';
import { getWeather } from '../lib/weather';
import { watchTaluka } from '../lib/store';
import { Alert } from './Icons';
import Speak from './Speak';

export default function Home({ farm, myCases, onFarm, goScan }) {
  const { t, pick, lang } = useLang();
  const [weather, setWeather] = useState(null);
  const [talukaCases, setTalukaCases] = useState([]);
  const [count, setCount] = useState('');

  useEffect(() => { getWeather(farm.lat, farm.lon).then(setWeather); }, [farm.lat, farm.lon]);
  useEffect(() => watchTaluka(farm.taluka, setTalukaCases), [farm.taluka]);

  const risks = evaluateRisks(farm, weather, talukaCases, new Set(myCases.map(c => c.id)));
  const [top, ...rest] = risks;
  const pbw = risks.find(r => r.id === 'pbw');

  const addTrap = (moths, date = today()) => {
    const traps = (farm.traps || []).filter(x => x.date !== date);
    traps.push({ date, moths });
    onFarm({ ...farm, traps });
  };
  const fillExample = () => {
    const vals = [4, 5, 6, 7, 9, 9, 9];
    const traps = vals.map((m, i) => ({ date: daysAgo(6 - i), moths: m }));
    onFarm({ ...farm, traps });
  };

  return (
    <main className="content">
      <div className="row between">
        <h2 className="h-title">{t('riskTitle')}</h2>
        <span className="pill pill-neutral">{cropName(farm.crop, lang)} · {t('day')} {cropDay(farm.sowDate)}</span>
      </div>

      {top && (
        <section className={'risk-hero ' + top.level}>
          <div className="row between">
            <div className="lvl"><Alert />{t(top.level)}</div>
            {top.level === 'HIGH' && <span className="pill" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>{t('actToday')}</span>}
          </div>
          <div className="pest">{pick(top.pest)}</div>
          <hr />
          <div className="sub">{t('whyAlert')}</div>
          <div style={{ fontSize: 14.5, marginTop: 4 }}>{pick(top.trigger)}</div>
          <div className="do">
            <div className="sub" style={{ marginTop: 0 }}>{t('doThis')}</div>
            <div style={{ fontSize: 15, marginTop: 4 }}>{pick(top.action)}</div>
          </div>
          <div style={{ marginTop: 10 }}><Speak light text={[pick(top.pest), t(top.level), pick(top.trigger), pick(top.action)].join('. ')} /></div>
        </section>
      )}

      {pbw && (
        <section className="card">
          <div className="row between">
            <h3>{t('trapTitle')}</h3>
          </div>
          <div className="small muted">{t('trapHint')}</div>
          <TrapChart traps={pbw.traps.slice(-7)} />
          <div className="row" style={{ marginTop: 10 }}>
            <input className="input" type="number" inputMode="numeric" min="0" placeholder="0"
              value={count} onChange={e => setCount(e.target.value)} style={{ maxWidth: 110 }} />
            <button className="btn-line btn-sage" disabled={count === ''}
              onClick={() => { addTrap(Math.max(0, parseInt(count, 10) || 0)); setCount(''); }}>{t('addCount')}</button>
            <button className="btn-line btn-sm" onClick={fillExample} title="Fills 7 nights of example counts">
              {t('demoData')}</button>
          </div>
        </section>
      )}

      {rest.map(r => (
        <section key={r.id} className="card-light">
          <div className="risk-row">
            <span className={'dotlvl dot-' + r.level} />
            <div style={{ flex: 1 }}>
              <div className="row between">
                <b>{pick(r.pest)}</b>
                <span className={'lvl-chip lvl-' + r.level}>{t(r.level)}</span>
              </div>
              <div className="small muted" style={{ marginTop: 2 }}>{pick(r.trigger)}</div>
              <div className="small" style={{ marginTop: 4, color: 'var(--color-accent-2-800)' }}>{pick(r.action)}</div>
            </div>
          </div>
        </section>
      ))}

      {weather && (
        <section className="card-light">
          <div className="section-h">{t('forecast')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, textAlign: 'center', fontSize: 12 }}>
            {weather.days.map(d => (
              <div key={d.date}>
                <div className="muted">{new Date(d.date).toLocaleDateString(LOCALE[lang], { weekday: 'short' })}</div>
                <div style={{ fontWeight: 700 }}>{Math.round(d.tMax)}°</div>
                <div>💧{d.rhMean}%</div>
                <div className="muted">{d.rain.toFixed(1)} mm</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <button className="btn-big" onClick={goScan}>📷 {t('capture')}</button>
    </main>
  );
}

function TrapChart({ traps }) {
  const W = 320, H = 130, pad = 22;
  const max = Math.max(12, ...traps.map(x => x.moths + 2));
  const y = v => H - pad - (v / max) * (H - pad - 10);
  const bw = traps.length ? Math.min(34, (W - 30) / traps.length - 8) : 30;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ marginTop: 8 }} role="img" aria-label="Trap counts">
      <line x1="20" x2={W - 4} y1={H - pad} y2={H - pad} stroke="var(--color-neutral-400)" />
      {traps.map((tr, i) => {
        const x = 28 + i * (bw + 8);
        const over = tr.moths >= PBW_ETL;
        return (
          <g key={tr.date}>
            <rect x={x} y={y(tr.moths)} width={bw} height={H - pad - y(tr.moths)} rx="8"
              fill={over ? 'var(--color-accent-500)' : 'var(--color-accent-2-400)'} />
            <text x={x + bw / 2} y={y(tr.moths) - 4} textAnchor="middle" fontSize="11" fill="var(--color-neutral-800)">{tr.moths}</text>
            <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--color-neutral-700)">{tr.date.slice(8)}</text>
          </g>
        );
      })}
      <line x1="20" x2={W - 4} y1={y(PBW_ETL)} y2={y(PBW_ETL)} stroke="var(--color-accent-800)" strokeDasharray="6 5" strokeWidth="2" />
      <text x="22" y={y(PBW_ETL) - 5} fontSize="10.5" fontWeight="700" fill="var(--color-accent-800)">ETL {PBW_ETL}</text>
      {traps.length === 0 && <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="12" fill="var(--color-neutral-700)">—</text>}
    </svg>
  );
}

function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10); }
