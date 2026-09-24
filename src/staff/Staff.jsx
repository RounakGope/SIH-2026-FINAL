import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  mode, watchStaff, staffLogin, staffLogout, watchAllCases, decideCase, bulkWrite, clearSeed
} from '../lib/store';
import { TALUKAS, DISTRICT } from '../content/talukas';
import { ipmFor, classesFor, THRESHOLD } from '../content/ipm';
import { countsForAlert } from '../content/rules';
import { makeSeed } from './seed';

const LEVEL_COLOR = { HIGH: '#b2622d', MEDIUM: '#f6a06b', LOW: '#aebf92' };
const DAY = 86400000;

export default function Staff() {
  const [staff, setStaff] = useState(undefined);
  const [cases, setCases] = useState([]);
  const [tab, setTab] = useState('map');

  useEffect(() => watchStaff(setStaff), []);
  useEffect(() => { if (staff) return watchAllCases(setCases); }, [staff]);

  if (staff === undefined) return <div className="staff" />;
  if (!staff) return <Login />;

  const pending = cases.filter(c => c.status === 'pending_review').sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="staff">
      <header className="staff-top">
        <h1>FasalRakshak · {DISTRICT}</h1>
        <div className="staff-tabs">
          <button className={tab === 'map' ? 'on' : ''} onClick={() => setTab('map')}>District dashboard</button>
          <button className={tab === 'queue' ? 'on' : ''} onClick={() => setTab('queue')}>Review queue ({pending.length})</button>
        </div>
        <div style={{ flex: 1 }} />
        <span className="small">{staff.email}</span>
        {mode === 'firebase' && <button className="btn-line btn-sm" style={{ color: '#f0fae1', borderColor: 'rgba(240,250,225,.4)' }} onClick={staffLogout}>Log out</button>}
      </header>
      <div className="staff-body">
        {mode === 'local' && <div className="banner">Local demo mode: data lives in this browser only. Add Firebase keys in .env to share it between phone and laptop.</div>}
        {tab === 'map' ? <Dashboard cases={cases} pending={pending} goQueue={() => setTab('queue')} /> : <Queue pending={pending} cases={cases} staff={staff} />}
        <SeedControls count={cases.filter(c => c.seed).length} />
      </div>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  return (
    <div className="staff">
      <form className="login" onSubmit={e => { e.preventDefault(); setErr(''); staffLogin(email, pw).catch(x => setErr(x.code || 'Login failed')); }}>
        <h2 className="h-title">Staff login</h2>
        <p className="small muted">KVK experts and district officers. Accounts are created in the Firebase console.</p>
        <input className="input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} />
        <button className="btn-big" type="submit">Log in</button>
        {err && <div className="banner">{err}</div>}
      </form>
    </div>
  );
}

export function talukaStats(cases) {
  const since = Date.now() - 14 * DAY;
  return TALUKAS.map(tk => {
    const counted = cases.filter(c => c.taluka === tk.name && c.createdAt >= since && countsForAlert(c));
    // Count per crop + disease: rust on soybean and rust on sugarcane are different outbreaks.
    const byKind = {};
    counted.forEach(c => { const k = (c.crop || 'Cotton') + '|' + c.label; byKind[k] = (byKind[k] || 0) + 1; });
    const top = Object.entries(byKind).sort((a, b) => b[1] - a[1])[0];
    const [topCrop, topLabel] = top ? top[0].split('|') : [];
    const n = counted.length;
    return { ...tk, n, top: top ? `${topCrop} ${ipmFor(topLabel, topCrop).name.en.toLowerCase()}` : null,
      level: n >= 15 ? 'HIGH' : n >= 6 ? 'MEDIUM' : 'LOW' };
  });
}

function Dashboard({ cases, pending, goQueue }) {
  const stats = useMemo(() => talukaStats(cases), [cases]);
  const week = cases.filter(c => c.createdAt >= Date.now() - 7 * DAY).length;
  const replies = cases.filter(c => c.expert?.at && c.createdAt >= Date.now() - 30 * DAY)
    .map(c => (c.expert.at - c.createdAt) / 3600000).sort((a, b) => a - b);
  const median = replies.length ? Math.round(replies[Math.floor(replies.length / 2)]) : null;
  const hot = stats.filter(s => s.level === 'HIGH').length;

  return (
    <>
      <div className="tiles">
        <div className="tile hot"><b>{hot}</b><span>Talukas at HIGH</span></div>
        <div className="tile"><b>{week}</b><span>Cases this week</span></div>
        <div className="tile hot" style={{ cursor: 'pointer' }} onClick={goQueue}><b>{pending.length}</b><span>Pending reviews →</span></div>
        <div className="tile"><b>{median != null ? median + ' h' : '—'}</b><span>Median expert reply</span></div>
      </div>
      <div className="map-grid">
        <div className="map">
          <MapContainer center={[20.85, 78.55]} zoom={9} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {stats.map(s => (
              <CircleMarker key={s.name} center={[s.lat, s.lon]} radius={10 + Math.sqrt(s.n) * 4}
                pathOptions={{ color: LEVEL_COLOR[s.level], fillColor: LEVEL_COLOR[s.level], fillOpacity: 0.55, weight: 2 }}>
                <Tooltip direction="top">
                  <b>{s.name}</b> · {s.level}<br />{s.n} confirmed cases, last 14 days{s.top ? <><br />Mostly {s.top}</> : null}
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        <div className="card-light">
          <div className="section-h">Hotspots by taluka · last 14 days</div>
          <div className="tlist">
            {[...stats].sort((a, b) => b.n - a.n).map(s => (
              <div key={s.name}>
                <span><b>{s.name}</b>{s.top && <span className="small muted"> · {s.top}</span>}</span>
                <span className="row" style={{ gap: 8 }}><span className="small">{s.n}</span><span className={'lvl-chip lvl-' + s.level}>{s.level}</span></span>
              </div>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
            Counts only expert-confirmed cases and on-device results above {Math.round(THRESHOLD * 100)}% confidence.
            HIGH ≥ 15, MEDIUM ≥ 6.
          </p>
        </div>
      </div>
    </>
  );
}

function Queue({ pending, cases, staff }) {
  const recent = cases.filter(c => c.expert?.at && !c.seed).sort((a, b) => b.expert.at - a.expert.at).slice(0, 6);
  return (
    <>
      {pending.length === 0 && <div className="card-light">No cases waiting. New unsure scans from farmers appear here as soon as they sync.</div>}
      <div className="queue">
        {pending.map(c => <QCard key={c.id} c={c} staff={staff} />)}
      </div>
      {recent.length > 0 && (
        <div className="card-light">
          <div className="section-h">Recently decided (live farmer cases)</div>
          <div className="tlist">
            {recent.map(c => (
              <div key={c.id}><span>{c.taluka} · {c.crop} {ipmFor(c.label, c.crop).name.en.toLowerCase()}</span><span className="small muted">{c.status} · {new Date(c.expert.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function QCard({ c, staff }) {
  const [correcting, setCorrecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const act = d => { setBusy(true); decideCase(c.id, d, staff.email).catch(e => { alertless(e); setBusy(false); }); };
  const ageH = Math.round((Date.now() - c.createdAt) / 3600000);
  return (
    <div className="qcard">
      {c.photo ? <img src={c.photo} alt="Leaf photo from farmer" /> : <div className="ph" />}
      <div className="row between">
        <b>{c.taluka} · {c.crop}</b>
        <span className={'small ' + (ageH > 24 ? 'lvl-chip lvl-HIGH' : 'muted')}>{ageH} h ago</span>
      </div>
      <div className="small muted">Day {c.cropDay} · {c.stage} · {c.plantsInfected}/{c.plantsWalked} plants · leaf {c.leafPct}%</div>
      <div className="top3">
        {(c.top3 || []).map(x => <div key={x.label}><span>{ipmFor(x.label, c.crop).name.en}</span><span className="muted">{Math.round(x.p * 100)}%</span></div>)}
      </div>
      {!correcting ? (
        <div className="acts">
          <button className="btn-line btn-sm btn-sage" disabled={busy} onClick={() => act({ status: 'confirmed', label: c.label })}>Confirm {ipmFor(c.label, c.crop).name.en}</button>
          <button className="btn-line btn-sm" disabled={busy} onClick={() => setCorrecting(true)}>Correct…</button>
          <button className="btn-line btn-sm" disabled={busy} onClick={() => act({ status: 'lab_referred' })}>Ask for lab sample</button>
        </div>
      ) : (
        <div className="acts">
          {classesFor(c.crop).map(l => (
            <button key={l} className="btn-line btn-sm" disabled={busy} onClick={() => act({ status: 'corrected', label: l })}>{ipmFor(l, c.crop).name.en}</button>
          ))}
          <button className="btn-line btn-sm" onClick={() => setCorrecting(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function SeedControls({ count }) {
  const [busy, setBusy] = useState(false);
  const run = async fn => { setBusy(true); try { await fn(); } catch (e) { alertless(e); } setBusy(false); };
  return (
    <div className="row small muted" style={{ flexWrap: 'wrap' }}>
      <span>Demo data: {count} seeded cases.</span>
      <button className="btn-line btn-sm" disabled={busy} onClick={() => run(async () => { await clearSeed(); await bulkWrite(makeSeed()); })}>
        {count ? 'Reset demo data' : 'Load demo data'}</button>
      {count > 0 && <button className="btn-line btn-sm" disabled={busy} onClick={() => run(clearSeed)}>Clear demo data</button>}
    </div>
  );
}

function alertless(e) { console.error(e); }
