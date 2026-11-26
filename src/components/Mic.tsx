import { useEffect, useRef, useState } from 'react';
import { Icon } from './ui';

type SR = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };
const getSR = (): (new () => SR) | null => (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition || null;

/** Botón de dictado: transcribe lo que dices y lo agrega al texto. */
export function MicButton({ onText }: { onText: (t: string) => void }) {
  const [on, setOn] = useState(false); const [err, setErr] = useState('');
  const rec = useRef<SR | null>(null);
  const Ctor = getSR();
  useEffect(() => () => rec.current?.stop(), []);
  if (!Ctor) return null;
  const toggle = () => {
    if (on) { rec.current?.stop(); return; }
    setErr('');
    const r = new Ctor(); r.lang = 'es-CO'; r.continuous = true; r.interimResults = false;
    r.onresult = e => { let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript; if (t.trim()) onText(t.trim()); };
    r.onend = () => setOn(false);
    r.onerror = e => { setOn(false); setErr(e.error === 'not-allowed' ? 'Permite el micrófono en tu navegador para dictar.' : 'No pude escucharte. Intenta de nuevo.'); };
    rec.current = r; r.start(); setOn(true);
  };
  return (
    <span className="mic-wrap">
      <button type="button" className={`mic${on ? ' on' : ''}`} onClick={toggle} aria-pressed={on} aria-label={on ? 'Detener dictado' : 'Dictar nota con el micrófono'}>
        <Icon name="mic" size={18} />{on ? 'Escuchando… toca para parar' : 'Dictar'}
      </button>
      {err && <span className="fine">{err}</span>}
    </span>
  );
}
