// Text of every SMS the system sends, in the recipient's language. Kept short:
// one SMS is 70 characters in Devanagari (UCS-2), so these run to 2–3 parts.
import { ipmFor } from './ipm';
import { talukaName } from './talukas';

const name = (label, crop, lang) => { const n = ipmFor(label, crop).name; return n[lang] || n.en; };

export function expertReplySms(c, lang = 'mr') {
  const d = name(c.label, c.crop, lang);
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
