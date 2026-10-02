import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  mode, watchStaff, staffLogin, staffLogout, watchAllCases, decideCase, bulkWrite, clearSeed, sendSms, broadcast, registeredPhones
} from '../lib/store';
import { expertReplySms, blockAlertSms, escalationSms } from '../content/sms';
import { bioInputPlan, surveillanceCsv, trainingZip, download, isEscalated, ESCALATE_AFTER_H } from './tools';
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
  const escalated = pending.filter(isEscalated);

  return (
    <div className="staff">
      <header className="staff-top">
        <h1>FasalRakshak · {DISTRICT}</h1>
        <div className="staff-tabs">
          <button className={tab === 'map' ? 'on' : ''} onClick={() => setTab('map')}>District dashboard</button>
          <button className={tab === 'queue' ? 'on' : ''} onClick={() => setTab('queue')}>Review queue ({pending.length}){escalated.length ? ` · ${escalated.length} late` : ''}</button>
          <button className={tab === 'actions' ? 'on' : ''} onClick={() => setTab('actions')}>Actions</button>
        </div>
        <div style={{ flex: 1 }} />
        <span className="small">{staff.email}</span>
        {mode !== 'local' && <button className="btn-line btn-sm" style={{ color: '#f0fae1', borderColor: 'rgba(240,250,225,.4)' }} onClick={staffLogout}>Log out</button>}
      </header>
      <div className="staff-body">
        {mode === 'local' && <div className="banner">Demo mode: cases are kept in this browser, so open the farmer app in another tab of this browser to see them arrive here.</div>}
        {mode !== 'api' && <AutoMessages cases={cases} />}
        {tab === 'map' ? <Dashboard cases={cases} pending={pending} escalated={escalated} goQueue={() => setTab('queue')} goActions={() => setTab('actions')} />
          : tab === 'queue' ? <Queue pending={pending} cases={cases} staff={staff} />
          : <Actions cases={cases} />}
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
      <form className="login" onSubmit={e => { e.preventDefault(); setErr(''); staffLogin(email, pw).catch(x => setErr(x.code || x.message || 'Login failed')); }}>
        <h2 className="h-title">Staff login</h2>
        <p className="small muted">KVK experts and district officers. {mode === 'api' ? 'Accounts are created on the FasalRakshak server.' : 'Accounts are created in the Firebase console.'}</p>
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

function Dashboard({ cases, pending, escalated, goQueue, goActions }) {
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
        <div className={'tile' + (escalated.length ? ' hot' : '')} style={{ cursor: 'pointer' }} onClick={goQueue}><b>{escalated.length}</b><span>Waiting over {ESCALATE_AFTER_H} h →</span></div>
      </div>
      <div className="card-light">
        <div className="section-h">One-click actions</div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button className="btn-line btn-sm" onClick={goQueue}>Open the {pending.length} pending reviews</button>
          <button className="btn-line btn-sm" onClick={goActions}>Broadcast an advisory by SMS</button>
          <button className="btn-line btn-sm" onClick={goActions}>Plan bio-input stock by block</button>
          <button className="btn-line btn-sm" onClick={goActions}>Export the week to CROPSAP / NPSS</button>
          <a className="btn-line btn-sm" href="/sms" target="_blank" rel="noreferrer">SMS sandbox inbox</a>
          <a className="btn-line btn-sm" href="/ivr" target="_blank" rel="noreferrer">IVR / missed-call line</a>
        </div>
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
  const [err, setErr] = useState('');
  const act = async d => {
    setBusy(true); setErr('');
    try {
      const updated = await decideCase(c.id, d, staff.email);
      // Farmer told by SMS (the API server does this itself).
      if (mode !== 'api' && c.phone) {
        const text = expertReplySms({ ...c, ...(updated || {}), status: d.status, label: d.label || c.label }, c.lang || 'mr');
        if (text) sendSms({ to: c.phone, text, kind: 'expert', taluka: c.taluka });
      }
    } catch (e) { console.error(e); setErr('Not saved: ' + (e.message || 'try again')); setBusy(false); }
  };
  const ageH = Math.round((Date.now() - c.createdAt) / 3600000);
  const voice = c.kind === 'ivr'; // no photo and no model label: the expert calls back and diagnoses
  const walk = [c.cropDay != null && 'Day ' + c.cropDay, c.stage, c.plantsWalked && `${c.plantsInfected}/${c.plantsWalked} plants`,
    c.leafPct != null && `leaf ${c.leafPct}%`].filter(Boolean).join(' · ');
  return (
    <div className="qcard">
      {c.kind === 'ivr'
        ? <div className="ivr-box"><b>📞 Voice report</b><p className="small" style={{ margin: '4px 0' }}>“{c.transcript || '(no transcript)'}”</p>
            <a className="btn-line btn-sm" href={'tel:' + c.phone}>Call back {c.phone}</a></div>
        : c.photo ? <img src={c.photo} alt="Leaf photo from farmer" /> : <div className="ph" />}
      {isEscalated(c) && <div className="lvl-chip lvl-HIGH" style={{ alignSelf: 'flex-start' }}>Escalated to district officer</div>}
      {c.serverCheck && <div className="small">Server re-check: {ipmFor(c.serverCheck.label, c.crop).name.en} {Math.round(c.serverCheck.p * 100)}% {c.serverCheck.agrees ? '(agrees)' : '(disagrees with the phone)'}</div>}
      <div className="row between">
        <b>{c.taluka} · {c.crop}</b>
        <span className={'small ' + (ageH > 24 ? 'lvl-chip lvl-HIGH' : 'muted')}>{ageH} h ago</span>
      </div>
      {walk && <div className="small muted">{walk}</div>}
      {!voice && <div className="small muted">AI’s diagnosis on the farmer’s phone:</div>}
      <div className="top3">
        {(c.top3 || []).map(x => <div key={x.label}><span>{ipmFor(x.label, c.crop).name.en}</span><span className="muted">{Math.round(x.p * 100)}%</span></div>)}
      </div>
      {!correcting ? (
        <div className="acts">
          {!voice && <button className="btn-line btn-sm btn-sage" disabled={busy} onClick={() => act({ status: 'confirmed', label: c.label })}>
            ✓ Agree: {c.label === 'other' ? 'the photo can’t be diagnosed' : 'it is ' + ipmFor(c.label, c.crop).name.en}</button>}
          <button className="btn-line btn-sm" disabled={busy} onClick={() => setCorrecting(true)}>
            {voice ? 'Choose the disease (after your call)' : '✎ Disagree: choose the right disease'}</button>
          <button className="btn-line btn-sm" disabled={busy} onClick={() => act({ status: 'lab_referred' })}>🧪 Not sure: ask for a lab sample</button>
        </div>
      ) : (
        <div className="acts">
          <div className="small" style={{ width: '100%' }}>{voice ? 'Your diagnosis after the call:' : 'It is actually:'}</div>
          {classesFor(c.crop).filter(l => !(voice && l === 'other')).map(l => (
            <button key={l} className="btn-line btn-sm" disabled={busy} onClick={() => act({ status: 'corrected', label: l })}>{ipmFor(l, c.crop).name.en}</button>
          ))}
          <button className="btn-line btn-sm" onClick={() => setCorrecting(false)}>Cancel</button>
        </div>
      )}
      {err && <div className="small" style={{ color: '#a8341f' }}>{err}</div>}
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

// Local / Firebase modes have no server scheduler, so the dashboard sends the
// automatic messages: SMS block alerts when a taluka turns HIGH for a crop, and an
// escalation SMS to the district officer for cases unanswered after 24 h. Each is
// sent once (remembered in this browser).
function AutoMessages({ cases }) {
  useEffect(() => {
    const sent = new Set(JSON.parse(localStorage.getItem('fr_auto_sms') || '[]'));
    const mark = k => { sent.add(k); localStorage.setItem('fr_auto_sms', JSON.stringify([...sent])); };
    const day = new Date().toISOString().slice(0, 10);
    const since = Date.now() - 14 * DAY;
    // Block alerts: per taluka, crop and disease, 15+ counted farms = HIGH.
    const groups = {};
    for (const c of cases) {
      if (c.createdAt < since || !countsForAlert(c)) continue;
      const k = [c.taluka, c.crop || 'Cotton', c.label].join('|');
      groups[k] = (groups[k] || 0) + 1;
    }
    for (const [k, n] of Object.entries(groups)) {
      if (n < 15 || sent.has('alert|' + k + '|' + day)) continue;
      const [taluka, crop, label] = k.split('|');
      for (const r of registeredPhones(taluka).filter(r => !r.crop || r.crop === crop)) {
        sendSms({ to: r.phone, text: blockAlertSms({ taluka, crop, label, farms: n }, r.lang || 'mr'), kind: 'alert', taluka });
      }
      mark('alert|' + k + '|' + day);
    }
    for (const c of cases.filter(isEscalated)) {
      if (sent.has('esc|' + c.id)) continue;
      sendSms({ to: 'District Agriculture Officer, Wardha', text: escalationSms(c), kind: 'escalation', taluka: c.taluka });
      mark('esc|' + c.id);
    }
  }, [cases]);
  return null;
}

function Actions({ cases }) {
  const [taluka, setTaluka] = useState(TALUKAS[0].name);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const plan = useMemo(() => bioInputPlan(cases), [cases]);
  const recipients = registeredPhones(taluka).length;
  const send = async () => {
    setStatus('Sending…');
    const r = await broadcast({ taluka, text });
    setStatus(`Sent to ${r.sent} registered number${r.sent === 1 ? '' : 's'} in ${taluka} (sandbox gateway).`);
    setText('');
  };
  const exportCsv = () => {
    const { csv, count } = surveillanceCsv(cases);
    download(new Blob([csv], { type: 'text/csv' }), `fasalrakshak-cropsap-npss-${localDate()}.csv`);
    setStatus(`Exported ${count} cases from the last 7 days.`);
  };
  const exportTraining = async () => {
    setStatus('Building the training set…');
    const { blob, count } = await trainingZip(cases);
    download(blob, `fasalrakshak-training-${localDate()}.zip`);
    setStatus(`Exported ${count} expert-checked photos for retraining.`);
  };
  return (
    <div className="actions-grid">
      <section className="card-light">
        <div className="section-h">Broadcast an advisory by SMS</div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <select className="input" style={{ maxWidth: 220 }} value={taluka} onChange={e => setTaluka(e.target.value)}>
            {TALUKAS.map(t => <option key={t.name}>{t.name}</option>)}
          </select>
          <span className="small muted">{mode === 'api' ? 'Recipients are counted on the server.' : `${recipients} registered number${recipients === 1 ? '' : 's'}`}</span>
        </div>
        <textarea className="input" rows={3} style={{ marginTop: 8, borderRadius: 16 }} maxLength={320} value={text}
          placeholder="e.g. Pink bollworm above threshold in Hinganghat. Check 20 green bolls this week; spray only if 2 or more are infested."
          onChange={e => setText(e.target.value)} />
        <div className="row between" style={{ marginTop: 8 }}>
          <span className="small muted">{text.length}/320 · write it in the language farmers read</span>
          <button className="btn-line btn-sm btn-sage" disabled={!text.trim()} onClick={send}>Send SMS</button>
        </div>
      </section>

      <section className="card-light">
        <div className="section-h">Bio-input stock for one application round, by block</div>
        {plan.length === 0 ? <p className="small muted">No counted cases in the last 14 days.</p> : (
          <table className="plan">
            <thead><tr><th>Taluka</th><th>Cases</th><th>Acres affected</th><th>Neem oil (L)</th><th>NSKE (kg)</th><th>Trichoderma (kg)</th></tr></thead>
            <tbody>{plan.map(r => <tr key={r.taluka}><td>{r.taluka}</td><td>{r.cases}</td><td>{r.acres}</td><td>{r.neemOilL}</td><td>{r.nskeKg}</td><td>{r.trichodermaKg}</td></tr>)}</tbody>
          </table>
        )}
        <p className="small muted" style={{ marginBottom: 0 }}>Acres affected = plot area × share of plants infected. Doses from the IPM content: neem oil 5 ml/L and NSKE 5% at 195 L of spray per acre; Trichoderma 2.5 kg/ha for chickpea wilt.</p>
      </section>

      <section className="card-light">
        <div className="section-h">Exports</div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-line btn-sm" onClick={exportCsv}>This week for CROPSAP / NPSS (CSV)</button>
          <button className="btn-line btn-sm" onClick={exportTraining}>Expert-checked photos for retraining (ZIP)</button>
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>Neither CROPSAP nor NPSS publishes an import API, so the export is a flat CSV with the fields their survey forms use; location is rounded to about 10 km.</p>
      </section>
      {status && <div className="banner" role="status">{status}</div>}
    </div>
  );
}

function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
