import { useEffect, useRef, useState } from 'react';
import { useLang, LOCALE } from '../lib/i18n';
import { loadModel, classify, modelInput, explain } from '../lib/model';
import { loadImage, lesionMask, smallJpeg } from '../lib/image';
import { upsertCase, newId, markTreatment } from '../lib/store';
import { referralFor } from '../content/labs';
import { ipmFor, classesFor, THRESHOLD, TIER_LABEL, CHEM_UNLOCK_INDEX } from '../content/ipm';
import { CROPS, cropDay, stageFor, stageName, cropName } from '../content/rules';
import { DISTRICT } from '../content/talukas';
import Speak from './Speak';

const WALK_KEY = 'fr_walk';
const PLANTS = 10;

export default function Scan({ farm, user, cases, goProgress }) {
  const { t, pick, lang } = useLang();
  const [model, setModel] = useState(null);
  const [walk, setWalk] = useState(() => {
    const w = readWalk();
    return w && (w.crop || 'Cotton') === farm.crop ? w : freshWalk(farm.crop);
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [addingView, setAddingView] = useState(false); // next photo = underside of the last leaf
  const fileRef = useRef(null);

  useEffect(() => { setModel(null); loadModel(farm.crop).then(setModel); }, [farm.crop]);
  useEffect(() => { try { localStorage.setItem(WALK_KEY, JSON.stringify(walk)); } catch {} }, [walk]);

  if (!CROPS[farm.crop]?.model) {
    return <main className="content"><h2 className="h-title">{t('diagTitle')}</h2>
      <div className="card-warm">{t('cropNoModel', { c: cropName(farm.crop, lang) })}</div></main>;
  }

  const day = cropDay(farm.sowDate);
  const crop = farm.crop;
  const stage = stageFor(day, crop);
  const photos = walk.plants.filter(p => p.kind === 'photo');
  const latest = photos[photos.length - 1];
  const walked = walk.plants.length;
  const infected = walk.plants.filter(p => p.kind === 'photo' && ipmFor(p.label, crop).diseased && p.confidence >= THRESHOLD).length;
  const savedCase = cases.find(c => c.id === walk.id);

  const saveWalk = (plants) => {
    const shots = plants.filter(p => p.kind === 'photo');
    if (!shots.length || !user) return;
    // The case's headline result = the most confident diseased photo, else the latest photo.
    const diseased = shots.filter(p => ipmFor(p.label, crop).diseased).sort((a, b) => b.confidence - a.confidence);
    const primary = diseased[0] || shots[shots.length - 1];
    const inf = plants.filter(p => p.kind === 'photo' && ipmFor(p.label, crop).diseased && p.confidence >= THRESHOLD).length;
    const leafSev = diseased.length ? diseased.reduce((s, p) => s + p.leafPct, 0) / diseased.length : 0;
    const unsure = shots.some(p => p.confidence < THRESHOLD || p.label === 'other');
    const existing = cases.find(c => c.id === walk.id);
    const decided = existing && ['confirmed', 'corrected', 'lab_referred'].includes(existing.status);
    // Field severity index = % plants infected × average leaf severity ÷ 100.
    const sevIndex = round(inf / plants.length * leafSev, 1);
    // Did the treatment logged on the previous walk work? Compared on the same plot.
    const prev = cases.filter(c => c.id !== walk.id && c.createdAt < walk.createdAt).sort((a, b) => b.createdAt - a.createdAt)[0];
    const followUp = prev?.treatment && prev.sevIndex != null
      ? { prevTreatment: prev.treatment.tier, improved: sevIndex < prev.sevIndex } : {};
    upsertCase({
      id: walk.id, uid: user.uid, plotId: farm.id, district: DISTRICT, taluka: farm.taluka,
      share: farm.share === true, lang, ...(farm.smsConsent && farm.phone ? { phone: farm.phone } : {}),
      sevIndex, ...followUp,
      crop: farm.crop, variety: farm.variety, acres: farm.acres, cropDay: day, stage,
      lat: +(+farm.lat).toFixed(2), lon: +(+farm.lon).toFixed(2), // ~1 km precision only
      confidence: round(primary.confidence), top3: primary.top3,
      leafPct: round(leafSev, 1), plantsInfected: inf, plantsWalked: plants.length,
      photo: primary.photo, createdAt: walk.createdAt, updatedAt: Date.now(),
      modelVersion: model?.demo ? 'demo' : `${crop.toLowerCase()}-v1-fp16`,
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
      // The demo predictor (no model files) only knows 'healthy' and one disease.
      const demoLabels = ['healthy', classesFor(crop).find(l => ipmFor(l, crop).diseased)];
      const input = modelInput(img, model.size);
      const top = await classify(model, input, sev, demoLabels);
      let plant = {
        kind: 'photo', label: top[0].label, confidence: top[0].p, all: top.map(x => ({ label: x.label, p: round(x.p, 4) })),
        top3: top.slice(0, 3).map(x => ({ label: x.label, p: round(x.p) })),
        leafPct: sev.pct, mask: sev.maskUrl, photo: smallJpeg(img), views: 1,
        cam: explain(model, input, img, top[0].label) // where the model looked
      };
      const last = walk.plants[walk.plants.length - 1];
      const merging = addingView && last?.kind === 'photo' && last.views === 1 && last.all;
      if (merging) plant = combineViews(last, plant);
      await new Promise(r => setTimeout(r, 600)); // let the scan animation read as "analysing"
      const plants = merging ? [...walk.plants.slice(0, -1), plant] : [...walk.plants, plant].slice(-PLANTS);
      setAddingView(false);
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
        {latest
          // The lesion overlay only means something for a disease: on a leaf the model
          // calls healthy it would contradict the result.
          ? ipmFor(latest.label, crop).diseased
            ? <img src={latest.mask} alt="Scanned leaf with lesions highlighted" />
            : <img src={latest.photo} alt="Scanned leaf" />
          : <span style={{ fontSize: 48 }}>🍃</span>}
        {busy && <div className="scan-sweep" />}
        <span className="photo-tag">{t('plantOf', { i: Math.min(walked + (busy ? 1 : 0) || 1, PLANTS) })}</span>
        {busy && <span className="photo-tag bottom">{t('analysing')}</span>}
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      {latest && latest.views === 1 && latest.all && !busy && walk.plants[walk.plants.length - 1] === latest && (
        <button className="btn-line" onClick={() => { setAddingView(true); fileRef.current.click(); }}>{t('addView')}</button>
      )}
      <button className="btn-big" disabled={!model || busy || walked >= PLANTS} onClick={() => fileRef.current.click()}>
        📷 {t('capture')}
      </button>
      <div className="row">
        <button className="btn-line" style={{ flex: 1 }} disabled={busy || walked >= PLANTS} onClick={healthyTap}>✓ {t('looksHealthy')}</button>
        <button className="btn-line" style={{ flex: 1 }} disabled={busy || walked === 0}
          onClick={() => setWalk(freshWalk(crop))}>↺ {t('newWalk')}</button>
      </div>
      {err && <div className="banner">{err}</div>}

      {latest && !busy && (
        <Result plant={latest} farm={farm} crop={crop} caseId={walk.id} day={day} stage={stage} infected={infected} walked={walked}
          savedCase={savedCase} goProgress={goProgress} />
      )}
    </main>
  );
}

function Result({ plant, farm, crop, caseId, day, stage, infected, walked, savedCase, goProgress }) {
  const { t, pick, lang } = useLang();
  const info = ipmFor(plant.label, crop);
  const unsure = plant.confidence < THRESHOLD || plant.label === 'other';
  // 'other' can be a confident answer ("not a leaf I know"), so it gets its own reason.
  const unsureText = plant.label === 'other'
    ? t('otherBody', { c: cropName(crop, lang) })
    : t('unsureBody', { t: Math.round(THRESHOLD * 100) });
  const pct = Math.round(plant.confidence * 100);
  const fieldIndex = walked ? (infected / walked) * 100 * (plant.leafPct / 100) : 0;
  const chemOpen = fieldIndex >= CHEM_UNLOCK_INDEX;
  const expert = savedCase?.expert;

  return (
    <>
      <section className="card">
        <div className="row between">
          <div className="section-h">{t('mostLikely')}</div>
          <Speak text={[pick(info.name), pick(info.markers), unsure ? unsureText : info.steps.filter(s => s.tier !== 'chemical').map(s => pick(s.text)).join(' ')].join('. ')} />
        </div>
        <h3 style={{ fontSize: 21, fontFamily: 'var(--font-heading)', fontWeight: 400 }}>{pick(info.name)}</h3>
        {plant.views === 2 && <div className="small muted">{t('twoViews')}</div>}
        <div className="stats" style={{ marginTop: 10 }}>
          <div className="stat"><b>{info.diseased ? plant.leafPct + '%' : '—'}</b><span>{t('severity')}</span></div>
          <div className="stat"><b>{infected}/{walked}</b><span>{t('plantsInfected')}</span></div>
          <div className="stat"><b>{t('day')} {day}</b><span>{stageName(stage, lang)}</span></div>
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
        {plant.cam && (
          <figure style={{ margin: '10px 0 8px' }}>
            <img src={plant.cam} alt={t('camAlt')} style={{ width: '100%', borderRadius: 14, display: 'block' }} />
            <figcaption className="small muted" style={{ marginTop: 6 }}>{t('camCaption')}</figcaption>
          </figure>
        )}
        <div className="top3">
          {plant.top3.map(x => <div key={x.label}><span>{pick(ipmFor(x.label, crop).name)}</span><span className="muted">{Math.round(x.p * 100)}%</span></div>)}
        </div>
      </section>

      {savedCase?.serverCheck && (
        <div className="server-check">
          {savedCase.serverCheck.agrees
            ? t('serverAgrees', { p: Math.round(savedCase.serverCheck.p * 100) })
            : t('serverDisagrees', { l: pick(ipmFor(savedCase.serverCheck.label, crop).name), p: Math.round(savedCase.serverCheck.p * 100) })}
        </div>
      )}
      {expert && <ExpertNote c={savedCase} />}
      {savedCase?.status === 'pending_review' && !expert && unsure === false && (
        <div className="card-light small">{t('waitingExpert')}</div>
      )}

      {unsure ? (
        <section className="card-warm">
          <h3>{t('unsureTitle')}</h3>
          <p className="small" style={{ margin: 0 }}>{unsureText}</p>
          {savedCase?.status === 'pending_review' && <div className="pill pill-wait" style={{ marginTop: 10 }}><span className="dot" />{t('waitingExpert')}</div>}
        </section>
      ) : null}
      {unsure ? <Referral farm={farm} compact /> : info.diseased ? (
        <>
          {info.referLab && <Referral farm={farm} />}
          <Ladder info={info} chemOpen={chemOpen} acres={farm.acres} caseId={caseId} done={savedCase?.treatment} />
          {!info.referLab && chemOpen && <Cost info={info} acres={farm.acres} goProgress={goProgress} />}
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
    : c.status === 'corrected' ? `${t('expertCorrected')} ${pick(ipmFor(e.label || c.label, c.crop).name)}`
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

// Nearest KVK and the right plant-pathology lab for this crop, with how to send a sample.
function Referral({ farm, compact }) {
  const { t, lang } = useLang();
  const { kvk, lab } = referralFor(farm.crop, farm.lat, farm.lon);
  return (
    <section className="card-warm">
      {!compact && <><h3>{t('labTitle')}</h3><p className="small">{t('labBody')}</p></>}
      <div className="small"><b>{t('nearestKvk')}:</b> {kvk.name} · {t('km', { n: kvk.km })}</div>
      <div className="row" style={{ gap: 8, margin: '6px 0', flexWrap: 'wrap' }}>
        {kvk.phones.map(p => <a key={p} className="btn-line btn-sm" href={'tel:' + p}>{t('call')} {p}</a>)}
      </div>
      {lab && <div className="small"><b>{t('nearestLab', { c: cropName(farm.crop, lang) })}:</b> {lab.name}, {lab.address} · {t('km', { n: lab.km })}</div>}
    </section>
  );
}

function Ladder({ info, chemOpen, acres, caseId, done }) {
  const { t, pick, lang } = useLang();
  return (
    <section className="card">
      <div className="section-h">{t('ipmTitle')}</div>
      {info.etl && <p className="small muted" style={{ marginTop: 0 }}>{pick(info.etl)}</p>}
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
                  : <Txt s={pick(s.text)} />}
                {!locked && (done?.tier === s.tier
                  ? <div className="step-done">✓ {t('doneOn', { d: new Date(done.at).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'short' }) })}</div>
                  : <div><button className="btn-line btn-sm" style={{ marginTop: 6 }} onClick={() => markTreatment(caseId, s)}>{t('markDone')}</button></div>)}
              </div>
            </div>
          );
        })}
      </div>
      {info.steps.filter(s => s.tier === 'chemical' && chemOpen).map((s, i) => (
        <div key={i} style={{ marginTop: 12 }}>
          <div className="section-h">{t('safeUse', { a: acres })}</div>
          <div className="safe-grid">
            {s.spot ? (
              // Spot treatment (a drench where plants were removed): dosed per litre, not per acre.
              <div className="stat"><b>{s.perLitre}</b><span>{t('perLitreSpot')}</span></div>
            ) : (
              <>
                <div className="stat"><b>{acres * s.tanksPerAcre}</b><span>{t('tanks', { l: s.tankL })}</span></div>
                <div className="stat"><b>{s.perTank ?? <span className="todo">TODO</span>}{s.perTank != null && ' ' + (s.unit || 'g')}</b><span>{t('perTank')}</span></div>
              </>
            )}
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

function Cost({ info, acres, goProgress }) {
  const { t } = useLang();
  const step = info.steps.find(s => s.tier === 'chemical' && !s.spot);
  if (!step) return null;
  const qty = step.perTank * step.tanksPerAcre * acres;
  const unit = step.unit || 'g';
  const shown = qty >= 1000 ? `${(qty / 1000).toFixed(2)} ${unit === 'ml' ? 'L' : 'kg'}` : `${Math.round(qty)} ${unit}`;
  return (
    <section className="card">
      <div className="section-h">{t('costTitle')}</div>
      <p className="small" style={{ margin: 0 }}>{t('costQty', { q: shown, a: acres })}</p>
      <button className="btn-line btn-sm" style={{ marginTop: 8 }} onClick={goProgress}>{t('costSee')} →</button>
    </section>
  );
}

// Two photos of one leaf (top and underside): average the class probabilities.
function combineViews(a, b) {
  const p = {};
  for (const v of [...a.all, ...b.all]) p[v.label] = (p[v.label] || 0) + v.p / 2;
  const all = Object.entries(p).map(([label, q]) => ({ label, p: round(q, 4) })).sort((x, y) => y.p - x.p);
  return {
    ...a, views: 2, all, label: all[0].label, confidence: all[0].p,
    top3: all.slice(0, 3).map(x => ({ label: x.label, p: round(x.p) })),
    leafPct: round((a.leafPct + b.leafPct) / 2, 1)
  };
}

function freshWalk(crop) { return { id: newId(), crop, createdAt: Date.now(), plants: [] }; }
function readWalk() { try { return JSON.parse(localStorage.getItem(WALK_KEY)); } catch { return null; } }
function round(x, d = 3) { const f = 10 ** d; return Math.round(x * f) / f; }
