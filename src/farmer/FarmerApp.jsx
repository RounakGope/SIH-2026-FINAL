import { useEffect, useState } from 'react';
import { useLang, LANGS } from '../lib/i18n';
import { initFarmer, getFarm, saveFarm, watchMyCases, mode } from '../lib/store';
import { loadModel } from '../lib/model';
import { CROPS, cropName } from '../content/rules';
import { talukaName } from '../content/talukas';
import { Leaf, Home as HomeIcon, Camera, Chart, Sprout } from './Icons';
import Setup from './Setup';
import Home from './Home';
import Scan from './Scan';
import Progress from './Progress';

export default function FarmerApp() {
  const { t, lang, setLang } = useLang();
  const [user, setUser] = useState(null);
  const [farm, setFarm] = useState(getFarm);
  const [tab, setTab] = useState(getFarm() ? 'home' : 'setup');
  const [cases, setCases] = useState([]);
  const [pending, setPending] = useState(0);
  const online = useOnline();

  useEffect(() => initFarmer(setUser), []);
  // Load the farmer's crop model as soon as the app opens: the first scan is then
  // instant, and the service worker caches the files for use offline.
  useEffect(() => { if (farm?.crop && CROPS[farm.crop]?.model) loadModel(farm.crop); }, [farm?.crop]);
  useEffect(() => {
    if (!user) return;
    return watchMyCases(user.uid, (list, pend) => {
      setCases(list.sort((a, b) => a.createdAt - b.createdAt));
      setPending(pend || 0);
    });
  }, [user]);

  const updateFarm = f => { setFarm(f); saveFarm(f, user?.uid); };

  let pill;
  if (mode === 'local') pill = <span className="pill pill-neutral"><span className="dot" />{t('localMode')}</span>;
  else if (pending > 0) pill = <span className="pill pill-wait"><span className="dot" />{online ? t('syncing', { n: pending }) : t('offlineWaiting', { n: pending })}</span>;
  else pill = <span className="pill pill-ok"><span className="dot" />{online ? t('synced') : t('offlineReady')}</span>;

  const screen = !farm || tab === 'setup'
    ? <Setup farm={farm} onSave={f => { updateFarm(f); setTab('home'); }} />
    : tab === 'home' ? <Home farm={farm} myCases={cases} onFarm={updateFarm} goScan={() => setTab('scan')} />
    : tab === 'scan' ? <Scan farm={farm} user={user} cases={cases} goProgress={() => setTab('progress')} />
    : <Progress farm={farm} cases={cases} />;

  return (
    <div className="app" data-lang={lang}>
      <header className="topbar">
        <div className="logo"><Leaf /></div>
        <div className="brand">
          <div className="brand-name">{t('appName')}</div>
          <div className="brand-sub">{farm ? `${talukaName(farm.taluka, lang)} · ${cropName(farm.crop, lang)}` : talukaName('Wardha', lang)}</div>
        </div>
        {pill}
        <div className="lang-toggle">
          {LANGS.map(([code, label]) => (
            <button key={code} className={lang === code ? 'on' : ''} onClick={() => setLang(code)} lang={code}>{label}</button>
          ))}
        </div>
      </header>
      {screen}
      {farm && (
        <nav className="tabbar">
          <div className="tabbar-inner">
            <TabBtn on={tab === 'home'} onClick={() => setTab('home')} icon={<HomeIcon />} label={t('home')} />
            <TabBtn on={tab === 'scan'} onClick={() => setTab('scan')} icon={<Camera />} label={t('scan')} />
            <TabBtn on={tab === 'progress'} onClick={() => setTab('progress')} icon={<Chart />} label={t('progress')} />
            <TabBtn on={tab === 'setup'} onClick={() => setTab('setup')} icon={<Sprout />} label={t('field')} />
          </div>
        </nav>
      )}
    </div>
  );
}

function TabBtn({ on, onClick, icon, label }) {
  return <button className={'tab' + (on ? ' on' : '')} onClick={onClick}>{icon}{label}</button>;
}

function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOn(true), down = () => setOn(false);
    window.addEventListener('online', up); window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return on;
}
