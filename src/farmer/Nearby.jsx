import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useLang } from '../lib/i18n';
import { watchDistrict } from '../lib/store';
import { outbreaksNear, cellCentre } from '../content/outbreaks';
import { TIER_LABEL } from '../content/ipm';
import { cropName } from '../content/rules';
import { talukaName } from '../content/talukas';

const RADII = ['5km', 'taluka', 'district'];

// Outbreak intelligence: what is active around this farm, ranked by how many farms
// report it, with what has worked for neighbours. Built from anonymous reports only.
export default function Nearby({ farm, myCases }) {
  const { t, pick, lang } = useLang();
  const farmsN = n => t(n === 1 ? 'farm1' : 'farmsN', { n });
  const [reports, setReports] = useState([]);
  const [radius, setRadius] = useState('5km');
  const [open, setOpen] = useState(null);
  useEffect(() => watchDistrict(setReports), []);

  const mine = useMemo(() => new Set(myCases.map(c => c.id)), [myCases]);
  const res = useMemo(() => outbreaksNear(reports, farm, radius, mine), [reports, farm, radius, mine]);
  const sel = res.groups.find(g => g.label === open) || null;
  const radiusLabel = r => r === '5km' ? t('r5km') : r === 'taluka' ? t('rTaluka', { t: talukaName(farm.taluka, lang) }) : t('rDistrict');
  const cells = (sel ? [sel] : res.groups).flatMap(g => g.cells.map(c => ({ ...c, sev: g.severity })));

  return (
    <main className="content">
      <div>
        <h2 className="h-title">{t('nearbyTitle')}</h2>
        <p className="lead">{t('nearbyLead', { c: cropName(farm.crop, lang) })}</p>
      </div>

      <div className="seg-row" role="radiogroup" aria-label={t('nearbyTitle')}>
        {RADII.map(r => (
          <button key={r} role="radio" aria-checked={radius === r} className={radius === r ? 'on' : ''}
            onClick={() => { setRadius(r); setOpen(null); }}>{radiusLabel(r)}</button>
        ))}
      </div>
      {res.widened && <div className="small muted">{t('widened', { r: radiusLabel(res.radius) })}</div>}

      <div className="nearby-map">
        <MapContainer center={[farm.lat, farm.lon]} zoom={res.radius === '5km' ? 11 : res.radius === 'taluka' ? 10 : 9}
          key={res.radius} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <CircleMarker center={[farm.lat, farm.lon]} radius={7} pathOptions={{ color: '#2f3b1f', fillColor: '#f5ead8', fillOpacity: 1, weight: 3 }}>
            <Tooltip>{t('yourField')}</Tooltip>
          </CircleMarker>
          {cells.map(c => (
            <CircleMarker key={c.cy + ',' + c.cx} center={cellCentre(c.cy, c.cx)} radius={8 + Math.sqrt(c.n) * 5}
              pathOptions={{ color: sevColour(c.sev), fillColor: sevColour(c.sev), fillOpacity: 0.45, weight: 1.5 }}>
              <Tooltip>{farmsN(c.n)}</Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <div className="small muted">{t('nearbyPrivacy')}</div>

      {res.groups.length === 0 ? (
        <div className="card-light">{t('nearbyEmpty', { r: radiusLabel(res.radius) })}</div>
      ) : (
        <div className="olist">
          {res.groups.map(g => (
            <button key={g.label} className={open === g.label ? 'on' : ''} aria-expanded={open === g.label}
              onClick={() => setOpen(open === g.label ? null : g.label)}>
              <span><b>{pick(g.info.name)}</b><br /><span className="small muted">{farmsN(g.farms)}{g.severity != null ? ' · ' + t('sevShort', { s: g.severity }) : ''}</span></span>
              <span aria-hidden="true">{open === g.label ? '▾' : '▸'}</span>
            </button>
          ))}
        </div>
      )}

      {sel && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>{pick(sel.info.name)}</h3>
          <div className="kv">
            <div><b>{sel.farms}</b><span>{t('farmsReporting')}</span></div>
            <div><b>{sel.severity != null ? sel.severity : '—'}</b><span>{t('severityIndex')}</span></div>
            <div><b>{sel.acres ? '≈ ' + sel.acres : '—'}</b><span>{t('acresAffected')}</span></div>
            <div><b>{radiusLabel(res.radius)}</b><span>{t('area')}</span></div>
          </div>
          <p className="small" style={{ marginBottom: 6 }}>{pick(sel.info.markers)}</p>
          <div className="section-h">{t('workedNeighbours')}</div>
          <p className="small" style={{ margin: 0 }}>
            {sel.worked
              ? t('workedText', { tier: pick(TIER_LABEL[sel.worked.tier]), n: sel.worked.farms, of: sel.worked.of })
              : t('workedNone')}
          </p>
        </section>
      )}
    </main>
  );
}

function sevColour(sev) {
  if (sev == null) return '#b2622d';
  return sev >= 15 ? '#a8341f' : sev >= 6 ? '#e08f52' : '#aebf92';
}
