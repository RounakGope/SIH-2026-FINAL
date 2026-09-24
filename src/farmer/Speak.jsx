import { useEffect, useState } from 'react';
import { useLang } from '../lib/i18n';
import { speak, stopSpeaking } from '../lib/speech';

// "Listen" button: reads the text aloud in the app's language, so a farmer who
// doesn't read comfortably still gets the advice.
export default function Speak({ text, light }) {
  const { t, lang } = useLang();
  const [on, setOn] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  const toggle = async () => {
    if (on) { stopSpeaking(); setOn(false); return; }
    setOn(true);
    const how = await speak(text, lang);
    if (how === 'none') setOn(false);
    else if (how === 'device') {
      // Clear the button state when the phone's voice finishes.
      const poll = setInterval(() => { if (!window.speechSynthesis.speaking) { setOn(false); clearInterval(poll); } }, 400);
    }
  };
  return (
    <button type="button" className="btn-line btn-sm" onClick={toggle} aria-pressed={on}
      style={light ? { color: '#fff', borderColor: 'rgba(255,255,255,.5)' } : undefined}>
      {on ? '■ ' + t('stop') : '🔊 ' + t('listen')}
    </button>
  );
}
