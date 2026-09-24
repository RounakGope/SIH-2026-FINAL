// English / Marathi / Hindi. Marathi and Hindi strings need a native speaker's review.
import { createContext, useContext, useState } from 'react';

const S = {
  appName: { en: 'FasalRakshak', mr: 'फसलरक्षक', hi: 'फ़सलरक्षक' },
  offlineReady: { en: 'Offline ready', mr: 'ऑफलाइन तयार', hi: 'ऑफ़लाइन तैयार' },
  offlineWaiting: { en: 'Offline · {n} waiting', mr: 'ऑफलाइन · {n} बाकी', hi: 'ऑफ़लाइन · {n} बाकी' },
  syncing: { en: 'Syncing {n}…', mr: '{n} पाठवत आहे…', hi: '{n} भेज रहे हैं…' },
  synced: { en: 'Synced', mr: 'पाठवले', hi: 'भेज दिया' },
  localMode: { en: 'Local demo mode', mr: 'स्थानिक डेमो', hi: 'स्थानीय डेमो' },
  home: { en: 'Home', mr: 'मुख्य', hi: 'मुख्य' },
  scan: { en: 'Scan', mr: 'स्कॅन', hi: 'स्कैन' },
  progress: { en: 'Progress', mr: 'प्रगती', hi: 'प्रगति' },
  field: { en: 'Field', mr: 'शेत', hi: 'खेत' },

  setupKicker: { en: 'One time only', mr: 'फक्त एकदाच', hi: 'सिर्फ़ एक बार' },
  setupTitle: { en: 'Set up your field', mr: 'तुमचे शेत नोंदवा', hi: 'अपना खेत दर्ज करें' },
  setupLead: { en: 'A few answers. After this the app works out crop stage, forecast and nearby outbreaks on its own.', mr: 'काही उत्तरे द्या. नंतर पीक अवस्था, हवामान अंदाज आणि जवळचा प्रादुर्भाव अ‍ॅप स्वतः काढते.', hi: 'कुछ जवाब दें। इसके बाद ऐप फ़सल की अवस्था, मौसम का पूर्वानुमान और आसपास का प्रकोप खुद निकालता है।' },
  crop: { en: 'Crop', mr: 'पीक', hi: 'फ़सल' },
  variety: { en: 'Variety', mr: 'वाण', hi: 'किस्म' },
  sowingDate: { en: 'Sowing date', mr: 'पेरणी तारीख', hi: 'बुवाई की तारीख' },
  farmSize: { en: 'Farm size', mr: 'शेताचे क्षेत्र', hi: 'खेत का रकबा' },
  acres: { en: 'acres', mr: 'एकर', hi: 'एकड़' },
  taluka: { en: 'Taluka', mr: 'तालुका', hi: 'तालुका' },
  useGps: { en: 'Use my location', mr: 'माझे स्थान वापरा', hi: 'मेरी लोकेशन लें' },
  saveField: { en: 'Save and continue', mr: 'जतन करा', hi: 'सहेजें और आगे बढ़ें' },
  credits: { en: 'About & data credits', mr: 'माहिती व डेटा श्रेय', hi: 'जानकारी व डेटा श्रेय' },
  day: { en: 'Day', mr: 'दिवस', hi: 'दिन' },

  riskTitle: { en: 'Risk this week', mr: 'या आठवड्याचा धोका', hi: 'इस हफ़्ते का ख़तरा' },
  whyAlert: { en: 'Why this alert', mr: 'हा इशारा का', hi: 'यह चेतावनी क्यों' },
  doThis: { en: 'Do this', mr: 'हे करा', hi: 'यह करें' },
  trapTitle: { en: 'Trap count vs threshold', mr: 'सापळा संख्या व पातळी', hi: 'ट्रैप गिनती व सीमा' },
  trapHint: { en: 'Pink bollworm moths per trap, each morning', mr: 'प्रति सापळा गुलाबी बोंडअळी पतंग, रोज सकाळी', hi: 'हर सुबह प्रति ट्रैप गुलाबी सुंडी के पतंगे' },
  addCount: { en: 'Add today', mr: 'आजची नोंद', hi: 'आज दर्ज करें' },
  forecast: { en: '5-day forecast', mr: '5 दिवसांचा अंदाज', hi: '5 दिन का पूर्वानुमान' },
  HIGH: { en: 'HIGH', mr: 'जास्त', hi: 'ज़्यादा' },
  MEDIUM: { en: 'MEDIUM', mr: 'मध्यम', hi: 'मध्यम' },
  LOW: { en: 'LOW', mr: 'कमी', hi: 'कम' },

  diagTitle: { en: 'Diagnosis report', mr: 'निदान अहवाल', hi: 'निदान रिपोर्ट' },
  diagLead: { en: '10-plant zig-zag walk · analysed on the phone, no network needed', mr: '10 झाडांची नागमोडी पाहणी · फोनवरच तपासणी, नेटवर्क नको', hi: '10 पौधों की टेढ़ी-मेढ़ी जाँच · फ़ोन पर ही विश्लेषण, नेटवर्क की ज़रूरत नहीं' },
  plantOf: { en: 'Plant {i} of 10', mr: 'झाड {i} / 10', hi: 'पौधा {i} / 10' },
  capture: { en: 'Photograph a leaf', mr: 'पानाचा फोटो घ्या', hi: 'पत्ती की फ़ोटो लें' },
  looksHealthy: { en: 'Plant looks healthy', mr: 'झाड निरोगी दिसते', hi: 'पौधा स्वस्थ दिखता है' },
  newWalk: { en: 'Start a new walk', mr: 'नवी पाहणी सुरू करा', hi: 'नई जाँच शुरू करें' },
  analysing: { en: 'Analysing on the phone…', mr: 'फोनवर तपासत आहे…', hi: 'फ़ोन पर जाँच हो रही है…' },
  mostLikely: { en: 'Most likely', mr: 'बहुधा', hi: 'सबसे संभावित' },
  severity: { en: 'leaf area affected', mr: 'पानाचे बाधित क्षेत्र', hi: 'पत्ती का प्रभावित हिस्सा' },
  plantsInfected: { en: 'plants infected', mr: 'बाधित झाडे', hi: 'प्रभावित पौधे' },
  confidence: { en: 'Confidence', mr: 'खात्री', hi: 'भरोसा' },
  prescribeAbove: { en: 'advice given above {t}%', mr: '{t}% वर सल्ला दिला जातो', hi: '{t}% से ऊपर सलाह दी जाती है' },
  unsureTitle: { en: 'Not sure. Sent to a KVK expert', mr: 'खात्री नाही. KVK तज्ञांकडे पाठवले', hi: 'पक्का नहीं। KVK विशेषज्ञ को भेजा गया' },
  unsureBody: { en: 'Confidence is below {t}%, so the app will not prescribe. The expert will reply here, usually within a day. Meanwhile, remove badly affected leaves and avoid spraying.', mr: 'खात्री {t}% पेक्षा कमी आहे, म्हणून अ‍ॅप औषध सुचवत नाही. तज्ञ येथे उत्तर देतील. तोपर्यंत जास्त बाधित पाने काढा आणि फवारणी टाळा.', hi: 'भरोसा {t}% से कम है, इसलिए ऐप दवा नहीं सुझाएगा। विशेषज्ञ यहीं जवाब देंगे, आम तौर पर एक दिन में। तब तक ज़्यादा प्रभावित पत्तियाँ हटाएँ और छिड़काव न करें।' },
  labTitle: { en: 'Get it confirmed before you act', mr: 'कृती करण्यापूर्वी खात्री करून घ्या', hi: 'कुछ करने से पहले पुष्टि करवाएँ' },
  labBody: { en: 'A photo alone cannot settle this one. Take a sample to the nearest KVK or plant-pathology lab: 3–4 affected leaves, or a whole plant with its roots, in a paper bag, not plastic.', mr: 'फक्त फोटोवरून हे ठरवता येत नाही. जवळच्या KVK किंवा प्रयोगशाळेत नमुना न्या: 3–4 बाधित पाने किंवा मुळांसह संपूर्ण झाड, कागदी पिशवीत, प्लास्टिक नको.', hi: 'सिर्फ़ फ़ोटो से यह तय नहीं हो सकता। नज़दीकी KVK या पौध-रोग प्रयोगशाला में नमूना ले जाएँ: 3–4 प्रभावित पत्तियाँ, या जड़ समेत पूरा पौधा, काग़ज़ की थैली में, प्लास्टिक में नहीं।' },
  ipmTitle: { en: 'IPM ladder · least toxic first', mr: 'एकात्मिक व्यवस्थापन · कमी विषारी आधी', hi: 'एकीकृत प्रबंधन · सबसे कम ज़हरीला पहले' },
  lockedChem: { en: 'Locked until the economic threshold is crossed', mr: 'आर्थिक नुकसान पातळी ओलांडेपर्यंत बंद', hi: 'आर्थिक नुकसान स्तर पार होने तक बंद' },
  safeUse: { en: 'Safe use · for your {a} acres', mr: 'सुरक्षित वापर · तुमच्या {a} एकरांसाठी', hi: 'सुरक्षित उपयोग · आपके {a} एकड़ के लिए' },
  tanks: { en: 'tanks of {l} L', mr: '{l} लि. टाक्या', hi: '{l} ली. की टंकियाँ' },
  perTank: { en: 'product per tank', mr: 'प्रति टाकी औषध', hi: 'प्रति टंकी दवा' },
  waitPeriod: { en: 'waiting period', mr: 'प्रतीक्षा कालावधी', hi: 'प्रतीक्षा अवधि' },
  actToday: { en: 'Act today', mr: 'आजच करा', hi: 'आज ही करें' },
  demoData: { en: 'Demo data', mr: 'उदाहरण', hi: 'उदाहरण' },
  gapTitle: { en: 'The gap, priced at the mandi rate', mr: 'फरक, बाजारभावाने', hi: 'अंतर, मंडी भाव से' },
  yieldKept: { en: 'of yield kept on {a} acres', mr: '{a} एकरवर वाचवलेले उत्पन्न', hi: '{a} एकड़ पर बचाई गई उपज' },
  stOnDevice: { en: 'on-device', mr: 'फोनवर', hi: 'फ़ोन पर' },
  stPending: { en: 'waiting for expert', mr: 'तज्ञांकडे', hi: 'विशेषज्ञ के पास' },
  stConfirmed: { en: 'expert-confirmed', mr: 'तज्ञांनी खात्री केली', hi: 'विशेषज्ञ ने पुष्टि की' },
  stCorrected: { en: 'expert-corrected', mr: 'तज्ञांनी दुरुस्त केले', hi: 'विशेषज्ञ ने सुधारा' },
  stLab: { en: 'lab sample asked', mr: 'प्रयोगशाळा नमुना', hi: 'प्रयोगशाला नमूना माँगा' },
  listen: { en: 'Listen', mr: 'ऐका', hi: 'सुनें' },
  stop: { en: 'Stop', mr: 'थांबा', hi: 'रोकें' },
  seeLabel: { en: 'read the pack', mr: 'पॅकवर पहा', hi: 'पैक पर देखें' },
  camAlt: { en: 'Photo with the areas that drove the diagnosis highlighted', mr: 'निदानासाठी महत्त्वाचे भाग ठळक केलेला फोटो', hi: 'निदान के लिए अहम हिस्से उभारी गई फ़ोटो' },
  camCaption: { en: 'Where the model looked: the warm areas drove this call. If they are not on the damaged spots, retake the photo or ask the expert.', mr: 'मॉडेलने कुठे पाहिले: उबदार रंगाच्या भागांवरून निदान झाले. ते बाधित ठिपक्यांवर नसल्यास पुन्हा फोटो घ्या किंवा तज्ञांना विचारा.', hi: 'मॉडल ने कहाँ देखा: गर्म रंग वाले हिस्सों से यह निदान हुआ। अगर वे खराब धब्बों पर नहीं हैं, तो फिर से फ़ोटो लें या विशेषज्ञ से पूछें।' },
  perLitreSpot: { en: 'per litre, spot drench', mr: 'प्रति लिटर, आळवणी', hi: 'प्रति लीटर, जड़ों के पास डालें' },
  costTitle: { en: 'What it costs, what it saves', mr: 'खर्च किती, बचत किती', hi: 'खर्च कितना, बचत कितनी' },
  valueProtected: { en: 'Value protected', mr: 'वाचवलेले उत्पन्न', hi: 'बचाई गई उपज का मूल्य' },
  youPay: { en: 'You pay', mr: 'तुमचा खर्च', hi: 'आपका खर्च' },
  illustrative: { en: 'Illustrative figures', mr: 'उदाहरणादाखल आकडे', hi: 'उदाहरण के आँकड़े' },
  expertSays: { en: 'KVK expert', mr: 'KVK तज्ञ', hi: 'KVK विशेषज्ञ' },
  expertConfirmed: { en: 'confirmed this diagnosis', mr: 'यांनी निदानाची खात्री केली', hi: 'ने इस निदान की पुष्टि की' },
  expertCorrected: { en: 'corrected this to', mr: 'यांनी दुरुस्त केले', hi: 'ने इसे सुधारकर बताया' },
  expertLab: { en: 'asked for a lab sample', mr: 'यांनी प्रयोगशाळा नमुना मागितला', hi: 'ने प्रयोगशाला नमूना माँगा' },
  waitingExpert: { en: 'Waiting for the expert', mr: 'तज्ञांच्या उत्तराची प्रतीक्षा', hi: 'विशेषज्ञ के जवाब का इंतज़ार' },
  cropNoModel: { en: 'Photo diagnosis works for cotton, soybean, chickpea and sugarcane now. {c} is coming next.', mr: 'फोटो निदान सध्या कापूस, सोयाबीन, हरभरा आणि उसासाठी आहे. {c} लवकरच.', hi: 'फ़ोटो निदान अभी कपास, सोयाबीन, चना और गन्ने के लिए है। {c} जल्द आ रहा है।' },
  demoModel: { en: 'Demo mode: the disease model for this crop has not loaded, so results are simulated.', mr: 'डेमो: या पिकाचे मॉडेल लोड झाले नाही, निकाल उदाहरणादाखल आहेत.', hi: 'डेमो: इस फ़सल का मॉडल लोड नहीं हुआ, नतीजे उदाहरण के लिए हैं।' },
  seeProgress: { en: 'See my progress', mr: 'माझी प्रगती पाहा', hi: 'मेरी प्रगति देखें' },

  progTitle: { en: 'My progress', mr: 'माझी प्रगती', hi: 'मेरी प्रगति' },
  progLead: { en: 'Same 10-plant walk, re-scored each time', mr: 'त्याच 10 झाडांची पुन्हा तपासणी', hi: 'उन्हीं 10 पौधों की हर बार दोबारा जाँच' },
  untreated: { en: 'If untreated (projected)', mr: 'उपचार न केल्यास (अंदाज)', hi: 'इलाज न करने पर (अनुमान)' },
  yourField: { en: 'Your field', mr: 'तुमचे शेत', hi: 'आपका खेत' },
  history: { en: 'Scan history', mr: 'स्कॅन इतिहास', hi: 'स्कैन इतिहास' },
  noScans: { en: 'No scans yet. Do your first 10-plant walk from the Scan tab.', mr: 'अजून स्कॅन नाही. स्कॅन टॅबवरून पहिली पाहणी करा.', hi: 'अभी कोई स्कैन नहीं। स्कैन टैब से पहली 10-पौधों की जाँच करें।' },
  exampleData: { en: 'Example curve: appears with your own scans after two walks', mr: 'उदाहरण: दोन पाहण्यांनंतर तुमचा आलेख दिसेल', hi: 'उदाहरण ग्राफ़: दो जाँचों के बाद आपका अपना ग्राफ़ दिखेगा' },
  severityIndex: { en: 'Field severity index', mr: 'शेत तीव्रता निर्देशांक', hi: 'खेत गंभीरता सूचकांक' }
};

export const LANGS = [['en', 'EN'], ['mr', 'मरा'], ['hi', 'हिं']];
export const LOCALE = { en: 'en-IN', mr: 'mr-IN', hi: 'hi-IN' };

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
