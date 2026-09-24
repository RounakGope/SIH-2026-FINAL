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
  const stage = stageFor(day, f.crop);

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

      <Credits />
    </main>
  );
}

// The disease models are trained on public datasets; the CC BY 4.0 ones require
// this credit in the app. Full terms: public/model/ATTRIBUTION.md.
const DATASETS = [
  ['Cotton', 'SAR-CLD-2024: A Comprehensive Dataset for Cotton Leaf Disease Detection', 'Bishshash, Nirob, Shikder & Sarower, Daffodil International University', 'CC BY 4.0', 'https://doi.org/10.17632/b3jy2p6k8w.2'],
  ['Cotton', 'Cotton Leaf Disease Dataset', 'Serosh Karim et al., Kaggle', 'licence not stated', 'https://www.kaggle.com/datasets/seroshkarim/cotton-leaf-disease-dataset'],
  ['Soybean', 'Multi-Class Soybean Leaf Disease Dataset', 'Thorwat, Magdum, Jadhav, Sutar & Oswal', 'CC BY 4.0', 'https://doi.org/10.17632/6fhphxg297.2'],
  ['Sugarcane', 'Sugarcane Leaf Disease Dataset', 'Daphal & Koli, Savitribai Phule Pune University', 'CC BY 4.0', 'https://doi.org/10.17632/9424skmnrk.1'],
  ['Chickpea', 'Fusarium Wilt Disease in Chickpea Dataset', 'Tolga Hayit et al., Kaggle', 'licence not stated', 'https://www.kaggle.com/datasets/tolgahayit/fusarium-wilt-disease-in-chickpea-dataset']
];

function Credits() {
  const { t } = useLang();
  return (
    <details className="card-light small">
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('credits')}</summary>
      <p style={{ marginTop: 10 }}>
        Leaf disease models trained by the FasalRakshak ML team on these public datasets.
        Backbone: MobileNetV2 (ImageNet weights, Apache 2.0), run on the phone with TensorFlow.js.
      </p>
      <ul style={{ paddingLeft: 18, margin: 0, display: 'grid', gap: 6 }}>
        {DATASETS.map(([crop, title, who, licence, url]) => (
          <li key={url}><b>{crop}</b>: <a href={url} target="_blank" rel="noreferrer">{title}</a>, {who}. {licence}.</li>
        ))}
      </ul>
      <p className="muted" style={{ marginBottom: 0 }}>
        Treatment advice: ICAR-CICR Nagpur cotton advisory 2024-25 and TNAU Agritech Portal.
        Weather: Open-Meteo. Map: © OpenStreetMap contributors.
      </p>
    </details>
  );
}

function defaultSowDate() {
  const d = new Date(Date.now() - 68 * 86400000);
  return d.toISOString().slice(0, 10);
}
