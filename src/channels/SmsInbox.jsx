import { useEffect, useMemo, useState } from 'react';
import { watchSms, watchStaff, mode } from '../lib/store';

const KIND = { alert: 'Block risk alert', expert: 'Expert reply', broadcast: 'Officer advisory', escalation: 'Escalation', ivr: 'IVR' };

// The SMS sandbox gateway: every message the system sends, as each recipient's
// phone would show it. Nothing here reaches a real phone: sending real SMS in India
// needs a gateway account and DLT-registered sender ID and templates.
export default function SmsInbox() {
  const [msgs, setMsgs] = useState([]);
  const [who, setWho] = useState('');
  const [staff, setStaff] = useState(null);
  useEffect(() => watchStaff(setStaff), []);
  useEffect(() => watchSms(setMsgs), [staff]);
  const numbers = useMemo(() => [...new Set(msgs.map(m => m.to))], [msgs]);
  const shown = msgs.filter(m => !who || m.to === who);

  return (
    <div className="staff sms-page">
      <header className="staff-top">
        <h1>SMS sandbox gateway</h1>
        <div style={{ flex: 1 }} />
        <span className="small">{msgs.length} message{msgs.length === 1 ? '' : 's'}</span>
      </header>
      <div className="staff-body" style={{ maxWidth: 560 }}>
        <div className="banner">Sandbox: these are the messages FasalRakshak would send. No real SMS leaves this {mode === 'api' ? 'server' : 'browser'}; a live gateway needs a DLT-registered sender ID.</div>
        {mode === 'api' && !staff && <div className="card-light small">The server's message log holds farmers' phone numbers, so it is for KVK and officer staff only. <a href="/staff">Sign in on the dashboard</a> in this browser, then come back.</div>}
        <select className="input" value={who} onChange={e => setWho(e.target.value)} aria-label="Recipient">
          <option value="">All recipients</option>
          {numbers.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        {shown.length === 0 && <div className="card-light small">No messages yet. They appear here when an expert replies to a farmer with a number, a taluka turns HIGH, a case waits over 24 h, or an officer broadcasts.</div>}
        <div className="sms-list">
          {shown.map(m => (
            <div key={m.id} className="sms">
              <div className="small muted">To {m.to} · {KIND[m.kind] || m.kind}{m.taluka ? ' · ' + m.taluka : ''} · {new Date(m.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              <div className="bubble" lang={/[ऀ-ॿ]/.test(m.text) ? 'mr' : 'en'}>{m.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
