import { useEffect, useRef, useState } from 'react';
import { ivrReport, registerPhone, watchTaluka } from '../lib/store';
import { speak, stopSpeaking, listen, canListen } from '../lib/speech';
import { TALUKAS, talukaName } from '../content/talukas';
import { cropName } from '../content/rules';
import { outbreaksNear } from '../content/outbreaks';

const CROPS = ['Cotton', 'Soybean', 'Chickpea', 'Sugarcane'];
const LANGS = ['mr', 'hi', 'en'];

// What the voice line says at each step, in each language.
const P = {
  welcome: { en: 'FasalRakshak. For Marathi press 1. For Hindi press 2. For English press 3.', mr: 'फसलरक्षक. मराठीसाठी 1 दाबा. हिंदीसाठी 2. इंग्रजीसाठी 3.', hi: 'फ़सलरक्षक। मराठी के लिए 1 दबाएँ। हिंदी के लिए 2। अंग्रेज़ी के लिए 3।' },
  crop: { en: 'Which crop? 1 cotton, 2 soybean, 3 chickpea, 4 sugarcane.', mr: 'कोणते पीक? 1 कापूस, 2 सोयाबीन, 3 हरभरा, 4 ऊस.', hi: 'कौन सी फ़सल? 1 कपास, 2 सोयाबीन, 3 चना, 4 गन्ना।' },
  taluka: { en: 'Which taluka? Press its number.', mr: 'कोणता तालुका? त्याचा क्रमांक दाबा.', hi: 'कौन सा तालुका? उसका नंबर दबाएँ।' },
  menu: { en: 'To report a problem in your field press 1. To get SMS alerts press 2. To hear this week’s risk press 3.', mr: 'शेतातील समस्या सांगण्यासाठी 1 दाबा. SMS सूचनांसाठी 2. या आठवड्याचा धोका ऐकण्यासाठी 3.', hi: 'खेत की समस्या बताने के लिए 1 दबाएँ। SMS सूचना के लिए 2। इस हफ़्ते का ख़तरा सुनने के लिए 3।' },
  record: { en: 'After the tone, describe what you see on the plants. Press the red button to start.', mr: 'टोननंतर झाडांवर काय दिसते ते सांगा. सुरू करण्यासाठी लाल बटण दाबा.', hi: 'टोन के बाद बताएँ कि पौधों पर क्या दिख रहा है। शुरू करने के लिए लाल बटन दबाएँ।' },
  confirm: { en: 'To send this to the KVK expert press 1. To record again press 2.', mr: 'हे KVK तज्ञांना पाठवण्यासाठी 1 दाबा. पुन्हा बोलण्यासाठी 2.', hi: 'इसे KVK विशेषज्ञ को भेजने के लिए 1 दबाएँ। फिर से बोलने के लिए 2।' },
  sent: { en: 'Thank you. A KVK expert will call you back on this number.', mr: 'धन्यवाद. KVK तज्ञ या नंबरवर परत फोन करतील.', hi: 'धन्यवाद। KVK विशेषज्ञ इसी नंबर पर वापस कॉल करेंगे।' },
  registered: { en: 'Done. You will get risk alerts for your taluka by SMS.', mr: 'झाले. तुमच्या तालुक्यासाठी धोक्याच्या सूचना SMS ने मिळतील.', hi: 'हो गया। आपके तालुके की ख़तरे की सूचना SMS से मिलेगी।' }
};

// A missed-call / IVR line for farmers without a smartphone, simulated in the
// browser: keypad in place of the phone keys, the browser's (or Bhashini's) voice
// in place of the telephony provider's. What it produces is real: a KVK queue case,
// an SMS registration, or the spoken risk for the taluka.
export default function IvrSim() {
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('idle');
  const [lang, setLang] = useState('mr');
  const [crop, setCrop] = useState(null);
  const [taluka, setTaluka] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [log, setLog] = useState([]);
  const [error, setError] = useState('');
  const reports = useRef([]);
  useEffect(() => { if (taluka) return watchTaluka(taluka.name, r => { reports.current = r; }); }, [taluka]);
  useEffect(() => () => stopSpeaking(), []);

  const say = (text, l = lang) => { setLog(x => [...x, { who: 'line', text }]); speak(text, l); };
  const go = (next, text) => { setStep(next); if (text) say(text); };
  const prompt = (key, l = lang) => P[key][l];

  const press = async key => {
    setLog(x => [...x, { who: 'caller', text: 'pressed ' + key }]);
    const n = parseInt(key, 10);
    if (step === 'lang' && n >= 1 && n <= 3) { const l = LANGS[n - 1]; setLang(l); go('crop', prompt('crop', l)); }
    else if (step === 'crop' && n >= 1 && n <= 4) { setCrop(CROPS[n - 1]); go('taluka', prompt('taluka') + ' ' + TALUKAS.map((t, i) => `${i + 1} ${talukaName(t.name, lang)}`).join(', ')); }
    else if (step === 'taluka' && n >= 1 && n <= TALUKAS.length) { setTaluka(TALUKAS[n - 1]); go('menu', prompt('menu')); }
    else if (step === 'menu' && n === 1) go('record', prompt('record'));
    else if (step === 'menu' && n === 2) {
      await registerPhone({ phone, taluka: taluka.name, crop, lang, via: 'ivr' });
      go('done', prompt('registered'));
    } else if (step === 'menu' && n === 3) {
      const res = outbreaksNear(reports.current, { crop, taluka: taluka.name, lat: taluka.lat, lon: taluka.lon }, 'taluka');
      const top = res.groups[0];
      const name = top ? (top.info.name[lang] || top.info.name.en) : null;
      go('done', top
        ? { en: `${talukaName(taluka.name, 'en')}: ${name} on ${top.farms === 1 ? '1 farm' : top.farms + ' farms'} in the last 14 days. Check your ${cropName(crop, 'en')} this week.`,
            mr: `${talukaName(taluka.name, 'mr')}: गेल्या 14 दिवसांत ${top.farms === 1 ? '1 शेतात' : top.farms + ' शेतांत'} ${name}. या आठवड्यात ${cropName(crop, 'mr')} तपासा.`,
            hi: `${talukaName(taluka.name, 'hi')}: पिछले 14 दिनों में ${top.farms === 1 ? '1 खेत में' : top.farms + ' खेतों में'} ${name}। इस हफ़्ते ${cropName(crop, 'hi')} जाँचें।` }[lang]
        : { en: 'No confirmed outbreaks in your taluka in the last 14 days.', mr: 'गेल्या 14 दिवसांत तुमच्या तालुक्यात खात्रीशीर प्रादुर्भाव नाही.', hi: 'पिछले 14 दिनों में आपके तालुके में कोई पुष्ट प्रकोप नहीं।' }[lang]);
    } else if (step === 'confirm' && n === 1) {
      try {
        await ivrReport({ phone, lang, crop, taluka: taluka.name, lat: taluka.lat, lon: taluka.lon, transcript });
        go('done', prompt('sent'));
      } catch (e) { setError(e.message); }
    } else if (step === 'confirm' && n === 2) { setTranscript(''); go('record', prompt('record')); }
  };

  const record = async () => {
    setStep('recording'); stopSpeaking();
    const text = await listen(lang, 8);
    setTranscript(text);
    setLog(x => [...x, { who: 'caller', text: text ? '“' + text + '”' : '(nothing heard: microphone blocked or silent)' }]);
    // No speech (no microphone permission, or silence): let the operator type it.
    if (text) go('confirm', prompt('confirm')); else setStep('type');
  };

  const missedCall = () => {
    setLog([{ who: 'caller', text: `Missed call from ${phone}` }, { who: 'line', text: 'Calling back…' }]);
    setError(''); setTranscript('');
    go('lang', P.welcome.mr + ' ' + P.welcome.hi + ' ' + P.welcome.en);
  };

  const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  return (
    <div className="staff ivr-page">
      <header className="staff-top"><h1>Missed-call / IVR line</h1><div style={{ flex: 1 }} /><span className="small">Simulator</span></header>
      <div className="staff-body" style={{ maxWidth: 460 }}>
        <div className="banner">Simulator: the keypad stands in for the phone and the browser's voice for the telephony provider. The case, SMS registration or risk message it produces is real.</div>
        {step === 'idle' || step === 'done' ? (
          <div className="card-light">
            <label className="small" htmlFor="ivr-phone">Farmer's mobile number</label>
            <input id="ivr-phone" className="input" type="tel" inputMode="numeric" maxLength={10} placeholder="98XXXXXXXX"
              value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
            <button className="btn-big" style={{ marginTop: 10 }} disabled={!/^[6-9]\d{9}$/.test(phone)} onClick={missedCall}>📞 Give a missed call</button>
          </div>
        ) : (
          <>
            <div className="ivr-log" aria-live="polite">
              {log.map((l, i) => <div key={i} className={'ivr-line ' + l.who}>{l.text}</div>)}
            </div>
            {step === 'record' && <button className="btn-big" style={{ background: '#a8341f' }} disabled={!canListen()} onClick={record}>● Record (8 seconds)</button>}
            {((step === 'record' && !canListen()) || step === 'type') && (
              <div className="card-light">
                <textarea className="input" rows={2} style={{ borderRadius: 14 }} placeholder="Type what the farmer says"
                  value={transcript} onChange={e => setTranscript(e.target.value)} />
                <button className="btn-line btn-sm" style={{ marginTop: 6 }} disabled={!transcript.trim()}
                  onClick={() => { setLog(x => [...x, { who: 'caller', text: '“' + transcript + '”' }]); go('confirm', prompt('confirm')); }}>Done</button>
              </div>
            )}
            {step === 'recording' && <div className="card-light">Listening…</div>}
            <div className="keypad">
              {keypad.map(k => <button key={k} onClick={() => press(k)} disabled={step === 'recording'}>{k}</button>)}
            </div>
          </>
        )}
        {step === 'done' && log.length > 0 && <div className="ivr-log">{log.slice(-1).map((l, i) => <div key={i} className="ivr-line line">{l.text}</div>)}</div>}
        {error && <div className="banner">{error}</div>}
      </div>
    </div>
  );
}
