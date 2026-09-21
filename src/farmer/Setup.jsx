import { useState } from 'react';
import { useLang } from '../lib/i18n';
import { CROPS, cropDay, stageFor, STAGE_MR } from '../content/rules';
import { TALUKAS, DEFAULT_LOCATION, nearestTaluka } from '../content/talukas';
import { Pin } from './Icons';

export default function Setup({ farm, onSave }) {
  const { t, lang } = useLang();
  const [f, setF] = useState(() => farm || {
    crop: 'Cotton', variety: CROPS.Cotton.variety, sowDate: defaultSowDate(), acres: 2,
    lat: DEFAULT_LOCATION.lat, lon: DEFAULT_LOCATION.lon, taluka: 'Wardha', traps: []
  });
  const [gpsMsg, setGpsMsg] = useState('');
  const set = patch => setF(prev => ({ ...prev, ...patch }));
  const day = cropDay(f.sowDate);
  const stage = stageFor(day);

  const gps = () => {
    if (!navigator.geolocation) return setGpsMsg('GPS not available');
    setGpsMsg('…');
    navigator.geolocation.getCurrentPosition(
      p => {
        const lat = +p.coords.latitude.toFixed(2), lon = +p.coords.longitude.toFixed(2);
        set({ lat, lon, taluka: nearestTaluka(lat, lon) });
        setGpsMsg(`${lat}°N, ${lon}°E`);
      },
      () => setGpsMsg('Could not get location, pick your taluka below'),
      { timeout: 8000 }
    );
  };

  return (
    <main className="content">
      <div>
        <div className="kicker">{t('setupKicker')}</div>
        <h2 className="h-title">{t('setupTitle')}</h2>
        <p className="lead">{t('setupLead')}</p>
      </div>

      <div>
        <div className="label">{t('crop')}</div>
        <div className="choice-grid">
          {Object.entries(CROPS).map(([name, c]) => (
            <button key={name} className={'choice' + (f.crop === name ? ' on' : '')}
              onClick={() => set({ crop: name, variety: c.variety })}>
              <span>{c.icon}</span>{lang === 'mr' ? c.mr : name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="label">{t('variety')}</div>
        <input className="input" value={f.variety} onChange={e => set({ variety: e.target.value })} />
      </div>

      <div>
        <div className="label">{t('sowingDate')}</div>
        <input className="input" type="date" value={f.sowDate} onChange={e => set({ sowDate: e.target.value })} />
      </div>
      {day && (
        <div className="info-strip">⏱ {t('day')} {day} · {lang === 'mr' ? STAGE_MR[stage] : stage}</div>
      )}

      <div>
        <div className="label">{t('farmSize')}</div>
        <div className="stepper">
          <button onClick={() => set({ acres: Math.max(1, f.acres - 1) })}>−</button>
          <div className="val">{f.acres}<small>{t('acres')}</small></div>
          <button onClick={() => set({ acres: Math.min(50, f.acres + 1) })}>+</button>
        </div>
      </div>

      <div>
        <div className="label">{t('taluka')}</div>
        <div className="row">
          <select className="input" value={f.taluka} onChange={e => {
            const tk = TALUKAS.find(x => x.name === e.target.value);
            set({ taluka: tk.name, lat: tk.lat, lon: tk.lon });
          }}>
            {TALUKAS.map(tk => <option key={tk.name} value={tk.name}>{lang === 'mr' ? tk.mr : tk.name}</option>)}
          </select>
          <button className="btn-line" onClick={gps} style={{ flex: 'none' }}><Pin />{t('useGps')}</button>
        </div>
        {gpsMsg && <div className="small muted" style={{ marginTop: 6 }}>{gpsMsg}</div>}
      </div>

      <button className="btn-big" onClick={() => onSave({ ...f, traps: f.traps || [] })}>{t('saveField')}</button>
    </main>
  );
}

function defaultSowDate() {
  const d = new Date(Date.now() - 68 * 86400000);
  return d.toISOString().slice(0, 10);
}
