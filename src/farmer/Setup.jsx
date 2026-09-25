import { useState } from 'react';
import { useLang, LOCALE } from '../lib/i18n';
import { CROPS, cropDay, stageFor, stageName, cropName } from '../content/rules';
import { AREA_UNITS, toAcres } from '../content/area';
import { TALUKAS, DEFAULT_LOCATION, nearestTaluka } from '../content/talukas';
import { Pin } from './Icons';

const pad = n => String(n).padStart(2, '0');
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };

export default function Setup({ farm, onSave }) {
  const { t, lang } = useLang();
  // Form values: the sowing month as "YYYY-MM" and the farm size as typed.
  const [f, setF] = useState(() => farm
    ? { ...farm, sowDate: (farm.sowDate || thisMonth()).slice(0, 7), area: String(farm.area ?? farm.acres ?? ''), areaUnit: farm.areaUnit || 'acre' }
    : { crop: 'Cotton', sowDate: thisMonth(), area: '', areaUnit: 'acre', lat: DEFAULT_LOCATION.lat, lon: DEFAULT_LOCATION.lon, taluka: 'Wardha', traps: [] });
  const [gpsMsg, setGpsMsg] = useState('');
  const set = patch => setF(prev => ({ ...prev, ...patch }));
  const day = cropDay(f.sowDate);
  const stage = stageFor(day, f.crop);

  // Sowing month and year: this year and the two before (sugarcane stays in the
  // field up to 18 months); no future months.
  const now = new Date();
  const [sy, sm] = f.sowDate.split('-').map(Number);
  const years = [0, 1, 2].map(i => now.getFullYear() - i);
  const monthNames = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(LOCALE[lang], { month: 'long' }));
  const setSow = (y, m) => set({ sowDate: `${y}-${pad(y === now.getFullYear() ? Math.min(m, now.getMonth() + 1) : m)}` });

  const area = parseFloat(f.area);
  const areaOk = area > 0;
  const save = () => {
    // Variety, the sensor simulator and the assistant-mode farmer name are no longer asked for.
    const { variety, sensorSim, farmerName, ...plot } = f;
    onSave({ ...plot, area, acres: toAcres(area, f.areaUnit), lang, traps: f.traps || [] });
  };

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
            <button key={name} className={'choice' + (f.crop === name ? ' on' : '')} onClick={() => set({ crop: name })}>
              <span>{c.icon}</span>{cropName(name, lang)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="label">{t('sowingDate')}</div>
        <div className="row">
          <select className="input" aria-label={t('sowMonth')} value={sm} onChange={e => setSow(sy, +e.target.value)}>
            {monthNames.map((name, i) => (
              <option key={i} value={i + 1} disabled={sy === now.getFullYear() && i > now.getMonth()}>{name}</option>
            ))}
          </select>
          <select className="input" aria-label={t('sowYear')} value={sy} onChange={e => setSow(+e.target.value, sm)} style={{ flex: '0 0 116px' }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      {day != null && (
        <div className="info-strip">⏱ {t('day')} {day} · {stageName(stage, lang)}</div>
      )}

      <div>
        <div className="label">{t('farmSize')}</div>
        <div className="row">
          <input className="input" type="number" inputMode="decimal" min="0" step="any" placeholder={t('farmSizePh')}
            aria-label={t('farmSize')} value={f.area} onChange={e => set({ area: e.target.value })} />
          <select className="input" aria-label={t('areaUnit')} value={f.areaUnit} onChange={e => set({ areaUnit: e.target.value })} style={{ flex: '0 0 150px' }}>
            {Object.entries(AREA_UNITS).map(([key, u]) => <option key={key} value={key}>{u[lang] || u.en}</option>)}
          </select>
        </div>
      </div>

      <div>
        <div className="label">{t('taluka')}</div>
        <div className="row">
          <select className="input" value={f.taluka} onChange={e => {
            const tk = TALUKAS.find(x => x.name === e.target.value);
            set({ taluka: tk.name, lat: tk.lat, lon: tk.lon });
          }}>
            {TALUKAS.map(tk => <option key={tk.name} value={tk.name}>{tk[lang] || tk.name}</option>)}
          </select>
          <button className="btn-line" onClick={gps} style={{ flex: 'none' }}><Pin />{t('useGps')}</button>
        </div>
        {gpsMsg && <div className="small muted" style={{ marginTop: 6 }}>{gpsMsg}</div>}
      </div>

      <div>
        <div className="label">{t('phone')}</div>
        <input className="input" type="tel" inputMode="numeric" maxLength={10} placeholder="98XXXXXXXX"
          value={f.phone || ''} onChange={e => set({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
        <label className="check">
          <input type="checkbox" checked={!!f.smsConsent} disabled={!/^[6-9]\d{9}$/.test(f.phone || '')}
            onChange={e => set({ smsConsent: e.target.checked })} />
          <span>{t('smsConsent')}</span>
        </label>
      </div>

      <div className="card-light">
        <div className="section-h">{t('privacyTitle')}</div>
        <label className="check">
          <input type="checkbox" checked={f.share === true} onChange={e => set({ share: e.target.checked })} />
          <span>{t('shareConsent')}<br /><span className="small muted">{t('shareConsentHint')}</span></span>
        </label>
      </div>

      <button className="btn-big" disabled={!areaOk} onClick={save}>{t('saveField')}</button>
      {!areaOk && <div className="small muted" style={{ marginTop: -8, textAlign: 'center' }}>{t('enterFarmSize')}</div>}

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
