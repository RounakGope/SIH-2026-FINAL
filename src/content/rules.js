// Risk rules, evaluated on the phone so alerts still work offline.
// CONTENT TEAM: check every threshold against its source before the demo.
import { ipmFor, THRESHOLD } from './ipm';
import { talukaName } from './talukas';

// `model: true` = public/model/<crop lowercased>/ holds a trained model.
export const CROPS = {
  Cotton: { mr: 'कापूस', hi: 'कपास', icon: '🌱', model: true },
  Soybean: { mr: 'सोयाबीन', hi: 'सोयाबीन', icon: '🌿', model: true },
  Chickpea: { mr: 'हरभरा', hi: 'चना', icon: '☘️', model: true },
  Sugarcane: { mr: 'ऊस', hi: 'गन्ना', icon: '🎋', model: true },
  Tur: { mr: 'तूर', hi: 'अरहर', icon: '🫘', model: false },
  Grape: { mr: 'द्राक्ष', hi: 'अंगूर', icon: '🍇', model: false }
};

// The farmer gives only the sowing month ("YYYY-MM"; older plots have a full
// date), so the crop's age counts whole months: the sowing month is day 0, the
// next month day 30, and so on.
export function cropDay(sowDate, today = new Date()) {
  const [y, m] = String(sowDate || '').split('-').map(Number);
  if (!y || !m) return null;
  return Math.max(0, ((today.getFullYear() - y) * 12 + today.getMonth() + 1 - m) * 30);
}
// "Jul 2026"
export function sowMonthLabel(sowDate, locale = 'en-IN') {
  const [y, m] = String(sowDate || '').split('-').map(Number);
  return y && m ? new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'short', year: 'numeric' }) : '';
}

// Growth stage from days after sowing: [last day of the stage, name], per crop.
// Approximate; the variety shifts these by a week or two.
const STAGES = {
  Cotton: [[29, 'Seedling'], [59, 'Squaring'], [95, 'Boll formation'], [Infinity, 'Boll maturation']],
  Soybean: [[34, 'Vegetative'], [49, 'Flowering'], [79, 'Pod development'], [Infinity, 'Maturity']],
  Chickpea: [[39, 'Vegetative'], [59, 'Flowering'], [89, 'Pod development'], [Infinity, 'Maturity']],
  Sugarcane: [[44, 'Germination'], [119, 'Tillering'], [269, 'Grand growth'], [Infinity, 'Maturity']],
  Tur: [[59, 'Vegetative'], [119, 'Flowering'], [159, 'Pod development'], [Infinity, 'Maturity']],
  Grape: [[Infinity, 'Growing']]
};
export function stageFor(day, crop = 'Cotton') {
  if (day == null) return '';
  return (STAGES[crop] || STAGES.Cotton).find(([last]) => day <= last)[1];
}
const STAGE_NAMES = {
  Seedling: { mr: 'रोप अवस्था', hi: 'पौध अवस्था' }, Squaring: { mr: 'पाते अवस्था', hi: 'कली अवस्था' },
  'Boll formation': { mr: 'बोंड धारणा', hi: 'टिंडा बनना' }, 'Boll maturation': { mr: 'बोंड परिपक्वता', hi: 'टिंडा पकना' },
  Vegetative: { mr: 'शाखीय वाढ', hi: 'वानस्पतिक बढ़वार' }, Flowering: { mr: 'फुलोरा', hi: 'फूल आना' },
  'Pod development': { mr: 'शेंगा धारणा', hi: 'फली बनना' }, Maturity: { mr: 'परिपक्वता', hi: 'पकना' },
  Germination: { mr: 'उगवण', hi: 'अंकुरण' }, Tillering: { mr: 'फुटवे', hi: 'कल्ले निकलना' },
  'Grand growth': { mr: 'जोमदार वाढ', hi: 'तेज़ बढ़वार' }, Growing: { mr: 'वाढ', hi: 'बढ़वार' }
};
// Stage and crop names in the app's language.
export const stageName = (stage, lang) => STAGE_NAMES[stage]?.[lang] || stage;
export const cropName = (crop, lang) => CROPS[crop]?.[lang] || crop;

// Pink bollworm: ETL = 8 moths per trap per night for 3 consecutive nights
// (ICAR-CICR cotton advisory, as cited in the deck).
const PBW_ETL = 8;

function pinkBollworm(farm) {
  const traps = [...(farm.traps || [])].sort((a, b) => a.date.localeCompare(b.date));
  const last3 = traps.slice(-3);
  const latest = traps[traps.length - 1];
  const above3 = last3.length === 3 && last3.every(t => t.moths >= PBW_ETL);
  let level = 'LOW';
  if (above3) level = 'HIGH';
  else if (latest && latest.moths >= PBW_ETL * 0.6) level = 'MEDIUM';
  const avg = last3.length ? Math.round((last3.reduce((s, t) => s + t.moths, 0) / last3.length) * 10) / 10 : null;
  return {
    id: 'pbw',
    pest: { en: 'Pink bollworm', mr: 'गुलाबी बोंडअळी', hi: 'गुलाबी सुंडी' },
    level,
    trigger: traps.length === 0
      ? { en: 'No trap counts yet. Add tonight’s count below.', mr: 'अजून सापळा नोंद नाही. आजची संख्या खाली भरा.', hi: 'अभी तक ट्रैप की कोई गिनती नहीं। आज की गिनती नीचे भरें।' }
      : above3
        ? { en: `Traps averaged ${avg} moths per trap for 3 nights running. The economic threshold is ${PBW_ETL}.`, mr: `सलग 3 रात्री सरासरी ${avg} पतंग प्रति सापळा. आर्थिक नुकसान पातळी ${PBW_ETL} आहे.`, hi: `लगातार 3 रातों में औसतन ${avg} पतंगे प्रति ट्रैप। आर्थिक नुकसान स्तर ${PBW_ETL} है।` }
        : { en: `Latest trap count ${latest.moths} moths (ETL ${PBW_ETL} for 3 nights).`, mr: `शेवटची नोंद ${latest.moths} पतंग (पातळी ${PBW_ETL}, सलग 3 रात्री).`, hi: `आखिरी गिनती ${latest.moths} पतंगे (स्तर ${PBW_ETL}, लगातार 3 रातें)।` },
    action: level === 'HIGH'
      ? { en: 'Check 20 green bolls today. Spray only if 2 or more are infested.', mr: 'आज 20 हिरवी बोंडे तपासा. 2 किंवा अधिक बाधित असतील तरच फवारणी करा.', hi: 'आज 20 हरे टिंडे जाँचें। 2 या ज़्यादा संक्रमित हों तभी छिड़काव करें।' }
      : { en: 'Keep pheromone traps up and count every morning.', mr: 'कामगंध सापळे लावून ठेवा आणि रोज सकाळी मोजा.', hi: 'फेरोमोन ट्रैप लगाए रखें और हर सुबह गिनें।' },
    traps
  };
}

// Example weather rule from the deck: humidity above 85% with rain on 3 or more
// of the next 5 days → leaf-spot risk. TODO: confirm with SAU/KVK.
function leafSpot(weather) {
  if (!weather) {
    return { id: 'leafspot', pest: { en: 'Leaf spot (weather)', mr: 'पानावरील ठिपके (हवामान)', hi: 'पत्ती धब्बा (मौसम)' }, level: 'LOW',
      trigger: { en: 'Forecast not loaded yet. Connect once to fetch it.', mr: 'हवामान अंदाज अजून आलेला नाही.', hi: 'मौसम का पूर्वानुमान अभी नहीं आया।' },
      action: { en: 'Open the app online once to fetch the 5-day forecast.', mr: 'अंदाजासाठी एकदा इंटरनेटसह अ‍ॅप उघडा.', hi: 'पूर्वानुमान के लिए एक बार इंटरनेट के साथ ऐप खोलें।' } };
  }
  const wetDays = weather.days.filter(d => d.rhMean > 85 && d.rain >= 2.5).length;
  // Example threshold, to be tuned by SAU/KVK: 3 humid, rainy days in the forecast.
  const level = wetDays >= 3 ? 'MEDIUM' : 'LOW';
  return {
    id: 'leafspot',
    pest: { en: 'Leaf spot (weather)', mr: 'पानावरील ठिपके (हवामान)', hi: 'पत्ती धब्बा (मौसम)' },
    level,
    // Say plainly that this counts forecast days, so it can't be read as "humidity
    // is above 85% now".
    trigger: wetDays === 0
      ? { en: 'No day in the 5-day forecast is both humid (over 85%) and rainy.', mr: 'पुढील 5 दिवसांत 85% पेक्षा जास्त आर्द्रता व पाऊस असलेला एकही दिवस नाही.', hi: 'अगले 5 दिनों में ऐसा कोई दिन नहीं जिसमें नमी 85% से ज़्यादा हो और बारिश भी हो।' }
      : { en: `${wetDays} of the next 5 days ${wetDays === 1 ? 'is' : 'are'} forecast to be humid (over 85%) and rainy.`, mr: `पुढील 5 पैकी ${wetDays} दिवस 85% पेक्षा जास्त आर्द्रता व पाऊस असण्याचा अंदाज.`, hi: `अगले 5 में से ${wetDays} दिन 85% से ज़्यादा नमी और बारिश का अनुमान।` },
    action: level === 'MEDIUM'
      ? { en: 'Avoid late irrigation; do a 10-plant scan in 2 days.', mr: 'उशिरा पाणी देणे टाळा; 2 दिवसांत 10 झाडांचे स्कॅन करा.', hi: 'देर शाम सिंचाई न करें; 2 दिन में 10 पौधों का स्कैन करें।' }
      : { en: 'No action needed this week.', mr: 'या आठवड्यात कृती आवश्यक नाही.', hi: 'इस हफ़्ते कुछ करने की ज़रूरत नहीं।' }
  };
}

// Outbreak near you: confirmed or confident cases in the same taluka, last 14 days.
export function countsForAlert(c) {
  const conf = c.status === 'confirmed' || c.status === 'corrected' ||
    (c.status === 'auto' && (c.confidence ?? 0) >= THRESHOLD);
  return conf && ipmFor(c.label, c.crop).diseased;
}
// Reports carry no uid, so the farmer's own scans are left out by case id.
// Only outbreaks on the farmer's own crop count (older cases have no crop: cotton).
function nearby(talukaCases, farm, myCaseIds) {
  const taluka = farm.taluka, tMr = talukaName(taluka, 'mr'), tHi = talukaName(taluka, 'hi');
  const since = Date.now() - 14 * 86400000;
  const recent = talukaCases.filter(c => c.createdAt >= since && !myCaseIds.has(c.id) &&
    (c.crop || 'Cotton') === farm.crop && countsForAlert(c));
  const byLabel = {};
  recent.forEach(c => { byLabel[c.label] = (byLabel[c.label] || 0) + 1; });
  const top = Object.entries(byLabel).sort((a, b) => b[1] - a[1])[0];
  const n = top ? top[1] : 0;
  const level = n >= 15 ? 'HIGH' : n >= 6 ? 'MEDIUM' : 'LOW';
  const name = top ? ipmFor(top[0], farm.crop).name : { en: 'No outbreaks', mr: 'प्रादुर्भाव नाही', hi: 'कोई प्रकोप नहीं' };
  return {
    id: 'nearby',
    pest: top ? name : { en: 'Outbreaks near you', mr: 'जवळपास प्रादुर्भाव', hi: 'आपके आसपास प्रकोप' },
    level,
    trigger: top
      ? { en: `${n === 1 ? '1 farm' : n + ' farms'} in ${taluka} reported ${name.en.toLowerCase()} in the last 14 days.`, mr: `${tMr} मध्ये गेल्या 14 दिवसांत ${n === 1 ? '1 शेतात' : n + ' शेतांत'} ${name.mr} नोंद.`, hi: `${tHi} में पिछले 14 दिनों में ${n === 1 ? '1 खेत में' : n + ' खेतों में'} ${name.hi || name.en} दर्ज।` }
      : { en: `No confirmed reports in ${taluka} in the last 14 days.`, mr: `${tMr} मध्ये गेल्या 14 दिवसांत नोंद नाही.`, hi: `${tHi} में पिछले 14 दिनों में कोई पुष्ट रिपोर्ट नहीं।` },
    action: top
      ? { en: 'Scan your field this week, before it spreads to you.', mr: 'पसरण्यापूर्वी या आठवड्यात तुमच्या शेताचे स्कॅन करा.', hi: 'फैलने से पहले इसी हफ़्ते अपने खेत का स्कैन करें।' }
      : { en: 'Nothing to do.', mr: 'कृती नाही.', hi: 'कुछ करने की ज़रूरत नहीं।' }
  };
}

const ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };
export function evaluateRisks(farm, weather, talukaCases, myCaseIds = new Set()) {
  const out = [];
  if (farm.crop === 'Cotton') out.push(pinkBollworm(farm));
  out.push(leafSpot(weather));
  out.push(nearby(talukaCases || [], farm, myCaseIds));
  return out.sort((a, b) => ORDER[a.level] - ORDER[b.level]);
}
export { PBW_ETL };
