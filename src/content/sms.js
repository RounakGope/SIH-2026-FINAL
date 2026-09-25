// Text of every SMS the system sends, in the recipient's language. Kept short:
// one SMS is 70 characters in Devanagari (UCS-2), so these run to 2–3 parts.
import { ipmFor } from './ipm';
import { talukaName } from './talukas';

const name = (label, crop, lang) => { const n = ipmFor(label, crop).name; return n[lang] || n.en; };

// A verdict of "healthy" or "can't tell from this photo" has no treatment to open.
const NO_DISEASE = {
  healthy: { en: 'KVK expert says the leaf looks healthy: no treatment needed. Scan again next week.', mr: 'KVK तज्ञांच्या मते पान निरोगी आहे: उपचाराची गरज नाही. पुढच्या आठवड्यात पुन्हा स्कॅन करा.', hi: 'KVK विशेषज्ञ के अनुसार पत्ता स्वस्थ है: इलाज की ज़रूरत नहीं। अगले हफ़्ते फिर स्कैन करें।' },
  other: { en: 'KVK expert could not tell from the photo. Please send a clearer one: one leaf filling the frame, in shade.', mr: 'फोटोवरून KVK तज्ञांना सांगता आले नाही. कृपया स्पष्ट फोटो पाठवा: एकच पान पूर्ण फ्रेममध्ये, सावलीत.', hi: 'फ़ोटो से KVK विशेषज्ञ तय नहीं कर पाए। कृपया साफ़ फ़ोटो भेजें: एक पत्ता पूरे फ़्रेम में, छाँव में।' }
};

// A voice report's caller may have no smartphone: the expert has called them back.
const VOICE = {
  en: d => `KVK expert's diagnosis: ${d}. Follow the steps the expert gave you on the call.`,
  mr: d => `KVK तज्ञांचे निदान: ${d}. फोनवर तज्ञांनी सांगितलेले उपाय करा.`,
  hi: d => `KVK विशेषज्ञ का निदान: ${d}। फ़ोन पर विशेषज्ञ के बताए उपाय करें।`
};

export function expertReplySms(c, lang = 'mr') {
  const d = name(c.label, c.crop, lang);
  if (c.kind === 'ivr' && c.status !== 'lab_referred') return (VOICE[lang] || VOICE.en)(d);
  if (c.status !== 'lab_referred' && !ipmFor(c.label, c.crop).diseased) {
    const m = NO_DISEASE[c.label === 'other' ? 'other' : 'healthy'];
    return m[lang] || m.en;
  }
  const verdict = {
    confirmed: { en: `KVK expert confirmed: ${d}. Open FasalRakshak for the treatment steps.`, mr: `KVK तज्ञांनी खात्री केली: ${d}. उपायांसाठी फसलरक्षक उघडा.`, hi: `KVK विशेषज्ञ ने पुष्टि की: ${d}। इलाज के लिए फ़सलरक्षक खोलें।` },
    corrected: { en: `KVK expert says it is ${d}. Open FasalRakshak for the treatment steps.`, mr: `KVK तज्ञांच्या मते हे ${d} आहे. उपायांसाठी फसलरक्षक उघडा.`, hi: `KVK विशेषज्ञ के अनुसार यह ${d} है। इलाज के लिए फ़सलरक्षक खोलें।` },
    lab_referred: { en: 'KVK expert asks for a sample: take 3-4 affected leaves in a paper bag to KVK Selsura.', mr: 'KVK तज्ञांनी नमुना मागितला: 3-4 बाधित पाने कागदी पिशवीत KVK सेलसुरा येथे न्या.', hi: 'KVK विशेषज्ञ ने नमूना माँगा: 3-4 प्रभावित पत्तियाँ काग़ज़ की थैली में KVK सेलसुरा ले जाएँ।' }
  }[c.status];
  return verdict ? verdict[lang] || verdict.en : null;
}

export function blockAlertSms({ taluka, crop, label, farms }, lang = 'mr') {
  const d = name(label, crop, lang), t = talukaName(taluka, lang);
  return {
    en: `FasalRakshak alert: ${d} reported on ${farms} farms in ${t} in 14 days. Check your field this week.`,
    mr: `फसलरक्षक इशारा: ${t} मध्ये 14 दिवसांत ${farms} शेतांत ${d}. या आठवड्यात शेत तपासा.`,
    hi: `फ़सलरक्षक चेतावनी: ${t} में 14 दिनों में ${farms} खेतों में ${d}। इस हफ़्ते खेत जाँचें।`
  }[lang];
}

export function escalationSms(c) {
  const hours = Math.round((Date.now() - c.createdAt) / 3600000);
  return `FasalRakshak: ${c.crop} case from ${c.taluka} has waited ${hours} h for a KVK expert. Please assign or decide.`;
}
