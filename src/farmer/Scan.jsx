import { useEffect, useRef, useState } from 'react';
import { useLang } from '../lib/i18n';
import { loadModel, classify } from '../lib/model';
import { loadImage, lesionMask, squareCanvas, smallJpeg } from '../lib/image';
import { upsertCase, newId } from '../lib/store';
import { IPM, ipmFor, THRESHOLD, TIER_LABEL, ECONOMICS, CHEM_UNLOCK_INDEX } from '../content/ipm';
import { CROPS, cropDay, stageFor, STAGE_MR } from '../content/rules';
import { DISTRICT } from '../content/talukas';

const WALK_KEY = 'fr_walk';
const PLANTS = 10;

export default function Scan({ farm, user, cases, goProgress }) {
  const { t, pick, lang } = useLang();
  const [model, setModel] = useState(null);
  const [walk, setWalk] = useState(() => readWalk() || freshWalk());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  useEffect(() => { loadModel().then(setModel); }, []);
  useEffect(() => { try { localStorage.setItem(WALK_KEY, JSON.stringify(walk)); } catch {} }, [walk]);

  if (!CROPS[farm.crop]?.model) {
    return <main className="content"><h2 className="h-title">{t('diagTitle')}</h2>
      <div className="card-warm">{t('cropNoModel', { c: lang === 'mr' ? CROPS[farm.crop].mr : farm.crop })}</div></main>;
  }

  const day = cropDay(farm.sowDate);
  const stage = stageFor(day);
  const photos = walk.plants.filter(p => p.kind === 'photo');
  const latest = photos[photos.length - 1];
  const walked = walk.plants.length;
  const infected = walk.plants.filter(p => p.kind === 'photo' && ipmFor(p.label).diseased && p.confidence >= THRESHOLD).length;
  const savedCase = cases.find(c => c.id === walk.id);

  const saveWalk = (plants) => {
    const shots = plants.filter(p => p.kind === 'photo');
    if (!shots.length || !user) return;
    // The case's headline result = the most confident diseased photo, else the latest photo.
    const diseased = shots.filter(p => ipmFor(p.label).diseased).sort((a, b) => b.confidence - a.confidence);
    const primary = diseased[0] || shots[shots.length - 1];
    const inf = plants.filter(p => p.kind === 'photo' && ipmFor(p.label).diseased && p.confidence >= THRESHOLD).length;
    const leafSev = diseased.length ? diseased.reduce((s, p) => s + p.leafPct, 0) / diseased.length : 0;
    const unsure = shots.some(p => p.confidence < THRESHOLD || p.label === 'other');
    const existing = cases.find(c => c.id === walk.id);
    const decided = existing && ['confirmed', 'corrected', 'lab_referred'].includes(existing.status);
    upsertCase({
      id: walk.id, uid: user.uid, district: DISTRICT, taluka: farm.taluka,
      crop: farm.crop, variety: farm.variety, acres: farm.acres, cropDay: day, stage,
      lat: +(+farm.lat).toFixed(2), lon: +(+farm.lon).toFixed(2), // ~1 km precision only
      confidence: round(primary.confidence), top3: primary.top3,
      leafPct: round(leafSev, 1), plantsInfected: inf, plantsWalked: plants.length,
      photo: primary.photo, createdAt: walk.createdAt, updatedAt: Date.now(),
      modelVersion: model?.demo ? 'demo' : 'tm-v1',
      // After an expert decision the label and status are the expert's; don't overwrite them.
      ...(decided ? {} : { label: primary.label, status: unsure ? 'pending_review' : 'auto', expert: null })
    });
  };

  const onFile = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !model) return;
    setBusy(true); setErr('');
    try {
      const img = await loadImage(file);
      const sev = lesionMask(img);
      const top = await classify(model, squareCanvas(img, model.size), sev);
      const plant = {
        kind: 'photo', label: top[0].label, confidence: top[0].p,
        top3: top.slice(0, 3).map(x => ({ label: x.label, p: round(x.p) })),
        leafPct: sev.pct, mask: sev.maskUrl, photo: smallJpeg(img)
      };
      await new Promise(r => setTimeout(r, 600)); // let the scan animation read as "analysing"
      const plants = [...walk.plants, plant].slice(-PLANTS);
      setWalk(w => ({ ...w, plants }));
      saveWalk(plants);
    } catch (ex) {
      console.error(ex); setErr('Could not read that photo. Try again.');
    } finally { setBusy(false); }
  };

  const healthyTap = () => {
    const plants = [...walk.plants, { kind: 'healthy' }].slice(-PLANTS);
    setWalk(w => ({ ...w, plants }));
    saveWalk(plants);
  };

  return (
    <main className="content">
      <div>
        <h2 className="h-title">{t('diagTitle')}</h2>
        <p className="lead">{t('diagLead')}</p>
        {model?.demo && <div className="banner" style={{ marginTop: 8 }}>{t('demoModel')}</div>}
      </div>

      <div className="photo-box">
        {latest ? <img src={latest.mask} alt="Scanned leaf with lesions highlighted" /> : <span style={{ fontSize: 48 }}>🍃</span>}
        {busy && <div className="scan-sweep" />}
        <span className="photo-tag">{t('plantOf', { i: Math.min(walked + (busy ? 1 : 0) || 1, PLANTS) })}</span>
        {busy && <span className="photo-tag bottom">{t('analysing')}</span>}
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <button className="btn-big" disabled={!model || busy || walked >= PLANTS} onClick={() => fileRef.current.click()}>
        📷 {t('capture')}
      </button>
      <div className="row">
        <button className="btn-line" style={{ flex: 1 }} disabled={busy || walked >= PLANTS} onClick={healthyTap}>✓ {t('looksHealthy')}</button>
        <button className="btn-line" style={{ flex: 1 }} disabled={busy || walked === 0}
          onClick={() => setWalk(freshWalk())}>↺ {t('newWalk')}</button>
      </div>
      {err && <div className="banner">{err}</div>}

      {latest && !busy && (
        <Result plant={latest} farm={farm} day={day} stage={stage} infected={infected} walked={walked}
          savedCase={savedCase} goProgress={goProgress} />
      )}
    </main>
  );
}

function Result({ plant, farm, day, stage, infected, walked, savedCase, goProgress }) {
  const { t, pick, lang } = useLang();
  const info = ipmFor(plant.label);
  const unsure = plant.confidence < THRESHOLD || plant.label === 'other';
  const pct = Math.round(plant.confidence * 100);
  const fieldIndex = walked ? (infected / walked) * 100 * (plant.leafPct / 100) : 0;
  const chemOpen = fieldIndex >= CHEM_UNLOCK_INDEX;
  const expert = savedCase?.expert;

  return (
    <>
      <section className="card">
        <div className="section-h">{t('mostLikely')}</div>
        <h3 style={{ fontSize: 21, fontFamily: 'var(--font-heading)', fontWeight: 400 }}>{pick(info.name)}</h3>
        <div className="stats" style={{ marginTop: 10 }}>
          <div className="stat"><b>{plant.leafPct}%</b><span>{t('severity')}</span></div>
          <div className="stat"><b>{infected}/{walked}</b><span>{t('plantsInfected')}</span></div>
          <div className="stat"><b>{t('day')} {day}</b><span>{lang === 'mr' ? STAGE_MR[stage] : stage}</span></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div className="row between"><b>{t('confidence')}</b><b>{pct}%</b></div>
          <div className="conf-bar">
            <i className={unsure ? 'low' : ''} style={{ width: pct + '%' }} />
            <span className="th" style={{ left: THRESHOLD * 100 + '%' }} />
          </div>
          <div className="small muted">{t('prescribeAbove', { t: Math.round(THRESHOLD * 100) })}</div>
        </div>
        <p className="small" style={{ marginTop: 10, marginBottom: 6 }}>{pick(info.markers)}</p>
        <div className="top3">
          {plant.top3.map(x => <div key={x.label}><span>{pick(ipmFor(x.label).name)}</span><span className="muted">{Math.round(x.p * 100)}%</span></div>)}
        </div>
      </section>

      {expert && <ExpertNote c={savedCase} />}
      {savedCase?.status === 'pending_review' && !expert && unsure === false && (
        <div className="card-light small">{t('waitingExpert')}</div>
      )}

      {unsure ? (
        <section className="card-warm">
          <h3>{t('unsureTitle')}</h3>
          <p className="small" style={{ margin: 0 }}>{t('unsureBody', { t: Math.round(THRESHOLD * 100) })}</p>
          {savedCase?.status === 'pending_review' && <div className="pill pill-wait" style={{ marginTop: 10 }}><span className="dot" />{t('waitingExpert')}</div>}
        </section>
      ) : info.diseased ? (
        <>
          {info.referLab && (
            <section className="card-warm"><h3>{t('labTitle')}</h3><p className="small" style={{ margin: 0 }}>{t('labBody')}</p></section>
          )}
          <Ladder info={info} chemOpen={chemOpen} acres={farm.acres} />
          {!info.referLab && <Cost acres={farm.acres} />}
        </>
      ) : null}

      <button className="btn-line w100" onClick={goProgress}>{t('seeProgress')} →</button>
    </>
  );
}

function ExpertNote({ c }) {
  const { t, pick } = useLang();
  const e = c.expert;
  const verb = c.status === 'confirmed' ? t('expertConfirmed')
    : c.status === 'corrected' ? `${t('expertCorrected')} ${pick(ipmFor(e.label || c.label).name)}`
    : t('expertLab');
  return (
    <section className="card-sage">
      <b>✓ {t('expertSays')}</b> <span className="small">{e.by}</span>
      <div className="small">{verb}</div>
    </section>
  );
}

function Txt({ s }) {
  if (!s) return null;
  return s.startsWith('TODO') ? <span className="todo">{s}</span> : <>{s}</>;
}

function Ladder({ info, chemOpen, acres }) {
  const { t, pick, lang } = useLang();
  return (
    <section className="card">
      <div className="section-h">{t('ipmTitle')}</div>
      <div className="ladder">
        {info.steps.map((s, i) => {
          const chem = s.tier === 'chemical';
          const locked = chem && !chemOpen;
          return (
            <div key={i} className={'rung' + (chem ? ' chem' : '') + (locked ? ' locked' : '')}>
              <span className="n">{i + 1}</span>
              <div className="t">
                <b>{pick(TIER_LABEL[s.tier])}</b>
                {chem
                  ? (locked ? t('lockedChem') : <Txt s={s.product} />)
                  : <Txt s={lang === 'mr' && s.text.mr && s.text.mr !== 'TODO' ? s.text.mr : s.text.en} />}
              </div>
            </div>
          );
        })}
      </div>
      {info.steps.filter(s => s.tier === 'chemical' && chemOpen).map((s, i) => (
        <div key={i} style={{ marginTop: 12 }}>
          <div className="section-h">{t('safeUse', { a: acres })}</div>
          <div className="safe-grid">
            <div className="stat"><b>{acres * s.tanksPerAcre}</b><span>{t('tanks', { l: s.tankL })}</span></div>
            <div className="stat"><b>{s.gPerTank ?? <span className="todo">TODO</span>}{s.gPerTank != null && ' g'}</b><span>{t('perTank')}</span></div>
            {/* The pre-harvest interval is printed on the pack and differs between
                manufacturers of the same active ingredient, so when we don't hold a
                verified figure we send the farmer to the label rather than guess. */}
            <div className="stat"><b style={s.waitDays == null ? { fontSize: 15 } : undefined}>{s.waitDays != null ? s.waitDays + ' d' : t('seeLabel')}</b><span>{t('waitPeriod')}</span></div>
            <div className="stat"><b style={{ fontSize: 15 }}>{s.ppe}</b><span>PPE</span></div>
          </div>
          <div className="small muted" style={{ marginTop: 6 }}>Source: <Txt s={s.source} /></div>
        </div>
      ))}
    </section>
  );
}

function Cost({ acres }) {
  const { t } = useLang();
  const cost = acres * ECONOMICS.remedyCostPerAcre;
  const subsidy = Math.round((cost * ECONOMICS.subsidyPct) / 100);
  const pay = cost - subsidy;
  const saved = acres * ECONOMICS.valueProtectedPerAcre;
  const pct = Math.max(2, (pay / saved) * 100);
  const fmt = n => '₹' + n.toLocaleString('en-IN');
  return (
    <section className="card">
      <div className="section-h">{t('costTitle')}</div>
      <div className="small muted">{t('valueProtected')}</div>
      <div className="bar-row"><div className="bar" style={{ width: '78%', background: 'var(--color-accent-2-600)' }} /><b>{fmt(saved)}</b></div>
      <div className="small muted">{t('youPay')}</div>
      <div className="bar-row"><div className="bar" style={{ width: pct * 0.78 + '%', background: 'var(--color-accent)' }} /><b>{fmt(pay)}</b></div>
      {ECONOMICS.illustrative && <div className="small"><span className="todo">{t('illustrative')}: src/content/ipm.js → ECONOMICS</span></div>}
    </section>
  );
}

function freshWalk() { return { id: newId(), createdAt: Date.now(), plants: [] }; }
function readWalk() { try { return JSON.parse(localStorage.getItem(WALK_KEY)); } catch { return null; } }
function round(x, d = 3) { const f = 10 ** d; return Math.round(x * f) / f; }
