// Spoken advice in English, Marathi and Hindi.
//
// 1. Bhashini (Government of India language platform) through our own API, which
//    keeps the Bhashini keys on the server: POST /api/speech/tts → WAV audio.
// 2. If the API isn't configured, has no Bhashini keys, or the phone is offline,
//    the phone's own speech engine (Web Speech API) reads the text instead.
import { api, apiEnabled } from './api';

const VOICE_LANG = { en: 'en-IN', mr: 'mr-IN', hi: 'hi-IN' };
let current = null;

export function stopSpeaking() {
  if (current) { current.pause(); current = null; }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

// Resolves to 'bhashini', 'device' or 'none' (nothing could speak it).
export async function speak(text, lang) {
  stopSpeaking();
  if (!text) return 'none';
  if (apiEnabled && navigator.onLine) {
    try {
      const { audio } = await api('/speech/tts', { method: 'POST', body: { text, lang } });
      current = new Audio('data:audio/wav;base64,' + audio);
      await current.play();
      return 'bhashini';
    } catch { /* no keys, no network, or Bhashini down: use the phone's voice */ }
  }
  return speakOnDevice(text, lang);
}

function speakOnDevice(text, lang) {
  if (!('speechSynthesis' in window)) return 'none';
  const want = VOICE_LANG[lang] || 'en-IN';
  const voices = window.speechSynthesis.getVoices();
  // Marathi voices are rare on phones; a Hindi voice reads Devanagari Marathi
  // understandably, which beats falling back to English.
  const voice = voices.find(v => v.lang === want) ||
    (lang === 'mr' && voices.find(v => v.lang === 'hi-IN')) ||
    voices.find(v => v.lang.startsWith(want.slice(0, 2)));
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang || want;
  if (voice) u.voice = voice;
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
  return 'device';
}

// ---------- speech to text (IVR intake) ----------
// Bhashini ASR through the API when available (audio recorded in the browser and
// sent as base64), else the browser's own recogniser (Chrome supports mr-IN,
// hi-IN and en-IN). Resolves to the transcript, or '' if nothing was heard.
export function canListen() {
  return (apiEnabled && !!navigator.mediaDevices?.getUserMedia) || 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

export async function listen(lang, seconds = 8) {
  if (apiEnabled && navigator.onLine && navigator.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = e => chunks.push(e.data);
      const done = new Promise(r => { rec.onstop = r; });
      rec.start(); setTimeout(() => rec.stop(), seconds * 1000);
      await done; stream.getTracks().forEach(t => t.stop());
      const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(',')[1]); fr.readAsDataURL(new Blob(chunks, { type: rec.mimeType })); });
      const { text } = await api('/speech/asr', { method: 'POST', body: { audio: b64, mime: rec.mimeType, lang } });
      if (text) return text;
    } catch { /* fall back to the browser recogniser */ }
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return '';
  return new Promise(resolve => {
    const r = new SR();
    r.lang = VOICE_LANG[lang] || 'en-IN'; r.interimResults = false; r.maxAlternatives = 1;
    let text = '';
    r.onresult = e => { text = e.results[0][0].transcript; };
    r.onend = () => resolve(text);
    r.onerror = () => resolve(text);
    r.start();
    setTimeout(() => { try { r.stop(); } catch {} }, seconds * 1000);
  });
}
