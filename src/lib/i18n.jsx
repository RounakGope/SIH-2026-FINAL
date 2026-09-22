// English / Marathi. Marathi strings need a native speaker's review.
import { createContext, useContext, useState } from 'react';

const S = {
  appName: { en: 'FasalRakshak', mr: 'फसलरक्षक' },
  offlineReady: { en: 'Offline ready', mr: 'ऑफलाइन तयार' },
  offlineWaiting: { en: 'Offline · {n} waiting', mr: 'ऑफलाइन · {n} बाकी' },
  syncing: { en: 'Syncing {n}…', mr: '{n} पाठवत आहे…' },
  synced: { en: 'Synced', mr: 'पाठवले' },
  localMode: { en: 'Local demo mode', mr: 'स्थानिक डेमो' },
  home: { en: 'Home', mr: 'मुख्य' },
  scan: { en: 'Scan', mr: 'स्कॅन' },
  progress: { en: 'Progress', mr: 'प्रगती' },
  field: { en: 'Field', mr: 'शेत' },

  setupKicker: { en: 'One time only', mr: 'फक्त एकदाच' },
  setupTitle: { en: 'Set up your field', mr: 'तुमचे शेत नोंदवा' },
  setupLead: { en: 'A few answers. After this the app works out crop stage, forecast and nearby outbreaks on its own.', mr: 'काही उत्तरे द्या. नंतर पीक अवस्था, हवामान अंदाज आणि जवळचा प्रादुर्भाव अ‍ॅप स्वतः काढते.' },
  crop: { en: 'Crop', mr: 'पीक' },
  variety: { en: 'Variety', mr: 'वाण' },
  sowingDate: { en: 'Sowing date', mr: 'पेरणी तारीख' },
  farmSize: { en: 'Farm size', mr: 'शेताचे क्षेत्र' },
  acres: { en: 'acres', mr: 'एकर' },
  taluka: { en: 'Taluka', mr: 'तालुका' },
  useGps: { en: 'Use my location', mr: 'माझे स्थान वापरा' },
  saveField: { en: 'Save and continue', mr: 'जतन करा' },
  day: { en: 'Day', mr: 'दिवस' },

  riskTitle: { en: 'Risk this week', mr: 'या आठवड्याचा धोका' },
  whyAlert: { en: 'Why this alert', mr: 'हा इशारा का' },
  doThis: { en: 'Do this', mr: 'हे करा' },
  trapTitle: { en: 'Trap count vs threshold', mr: 'सापळा संख्या व पातळी' },
  trapHint: { en: 'Pink bollworm moths per trap, each morning', mr: 'प्रति सापळा गुलाबी बोंडअळी पतंग, रोज सकाळी' },
  addCount: { en: 'Add today', mr: 'आजची नोंद' },
  forecast: { en: '5-day forecast', mr: '5 दिवसांचा अंदाज' },
  HIGH: { en: 'HIGH', mr: 'जास्त' },
  MEDIUM: { en: 'MEDIUM', mr: 'मध्यम' },
  LOW: { en: 'LOW', mr: 'कमी' },

  diagTitle: { en: 'Diagnosis report', mr: 'निदान अहवाल' },
  diagLead: { en: '10-plant zig-zag walk · analysed on the phone, no network needed', mr: '10 झाडांची नागमोडी पाहणी · फोनवरच तपासणी, नेटवर्क नको' },
  plantOf: { en: 'Plant {i} of 10', mr: 'झाड {i} / 10' },
  capture: { en: 'Photograph a leaf', mr: 'पानाचा फोटो घ्या' },
  looksHealthy: { en: 'Plant looks healthy', mr: 'झाड निरोगी दिसते' },
  newWalk: { en: 'Start a new walk', mr: 'नवी पाहणी सुरू करा' },
  analysing: { en: 'Analysing on the phone…', mr: 'फोनवर तपासत आहे…' },
  mostLikely: { en: 'Most likely', mr: 'बहुधा' },
  severity: { en: 'leaf area affected', mr: 'पानाचे बाधित क्षेत्र' },
  plantsInfected: { en: 'plants infected', mr: 'बाधित झाडे' },
  confidence: { en: 'Confidence', mr: 'खात्री' },
  prescribeAbove: { en: 'advice given above {t}%', mr: '{t}% वर सल्ला दिला जातो' },
  unsureTitle: { en: 'Not sure. Sent to a KVK expert', mr: 'खात्री नाही. KVK तज्ञांकडे पाठवले' },
  unsureBody: { en: 'Confidence is below {t}%, so the app will not prescribe. The expert will reply here, usually within a day. Meanwhile, remove badly affected leaves and avoid spraying.', mr: 'खात्री {t}% पेक्षा कमी आहे, म्हणून अ‍ॅप औषध सुचवत नाही. तज्ञ येथे उत्तर देतील. तोपर्यंत जास्त बाधित पाने काढा आणि फवारणी टाळा.' },
  labTitle: { en: 'Looks viral: get it confirmed', mr: 'विषाणूजन्य वाटते: खात्री करून घ्या' },
  labBody: { en: 'Take a sample to the nearest KVK or plant-pathology lab. Put 3–4 affected leaves in a paper bag, not plastic.', mr: 'जवळच्या KVK किंवा प्रयोगशाळेत नमुना न्या. 3–4 बाधित पाने कागदी पिशवीत ठेवा, प्लास्टिक नको.' },
  ipmTitle: { en: 'IPM ladder · least toxic first', mr: 'एकात्मिक व्यवस्थापन · कमी विषारी आधी' },
  lockedChem: { en: 'Locked until the economic threshold is crossed', mr: 'आर्थिक नुकसान पातळी ओलांडेपर्यंत बंद' },
  safeUse: { en: 'Safe use · for your {a} acres', mr: 'सुरक्षित वापर · तुमच्या {a} एकरांसाठी' },
  tanks: { en: 'tanks of {l} L', mr: '{l} लि. टाक्या' },
  perTank: { en: 'product per tank', mr: 'प्रति टाकी औषध' },
  waitPeriod: { en: 'waiting period', mr: 'प्रतीक्षा कालावधी' },
  seeLabel: { en: 'read the pack', mr: 'पॅकवर पहा' },
  costTitle: { en: 'What it costs, what it saves', mr: 'खर्च किती, बचत किती' },
  valueProtected: { en: 'Value protected', mr: 'वाचवलेले उत्पन्न' },
  youPay: { en: 'You pay', mr: 'तुमचा खर्च' },
  illustrative: { en: 'Illustrative figures', mr: 'उदाहरणादाखल आकडे' },
  expertSays: { en: 'KVK expert', mr: 'KVK तज्ञ' },
  expertConfirmed: { en: 'confirmed this diagnosis', mr: 'यांनी निदानाची खात्री केली' },
  expertCorrected: { en: 'corrected this to', mr: 'यांनी दुरुस्त केले' },
  expertLab: { en: 'asked for a lab sample', mr: 'यांनी प्रयोगशाळा नमुना मागितला' },
  waitingExpert: { en: 'Waiting for the expert', mr: 'तज्ञांच्या उत्तराची प्रतीक्षा' },
  cropNoModel: { en: 'Photo diagnosis is available for cotton now. {c} is coming next.', mr: 'फोटो निदान सध्या कापसासाठी आहे. {c} लवकरच.' },
  demoModel: { en: 'DEMO predictor: put the real model files in public/model', mr: 'डेमो मॉडेल' },
  seeProgress: { en: 'See my progress', mr: 'माझी प्रगती पाहा' },

  progTitle: { en: 'My progress', mr: 'माझी प्रगती' },
  progLead: { en: 'Same 10-plant walk, re-scored each time', mr: 'त्याच 10 झाडांची पुन्हा तपासणी' },
  untreated: { en: 'If untreated (projected)', mr: 'उपचार न केल्यास (अंदाज)' },
  yourField: { en: 'Your field', mr: 'तुमचे शेत' },
  history: { en: 'Scan history', mr: 'स्कॅन इतिहास' },
  noScans: { en: 'No scans yet. Do your first 10-plant walk from the Scan tab.', mr: 'अजून स्कॅन नाही. स्कॅन टॅबवरून पहिली पाहणी करा.' },
  exampleData: { en: 'Example curve: appears with your own scans after two walks', mr: 'उदाहरण: दोन पाहण्यांनंतर तुमचा आलेख दिसेल' },
  severityIndex: { en: 'Field severity index', mr: 'शेत तीव्रता निर्देशांक' }
};

const LangCtx = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('fr_lang') || 'en');
  const setLang = l => { setLangState(l); try { localStorage.setItem('fr_lang', l); } catch {} };
  const t = (key, vars) => {
    let s = S[key]?.[lang] ?? S[key]?.en ?? key;
    if (vars) Object.entries(vars).forEach(([k, v]) => { s = s.replaceAll('{' + k + '}', v); });
    return s;
  };
  // pick({en, mr}) for content objects
  const pick = obj => (obj ? obj[lang] && obj[lang] !== 'TODO' ? obj[lang] : obj.en : '');
  return <LangCtx.Provider value={{ lang, setLang, t, pick }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);
