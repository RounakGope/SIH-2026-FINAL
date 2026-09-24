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
