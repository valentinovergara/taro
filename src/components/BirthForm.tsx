import { useEffect, useRef, useState } from 'react';
import { searchPlaces, type Birth, type Place } from '../lib/natal';
import { Icon } from './ui';

/** Fecha, hora y lugar de nacimiento. El lugar se busca por nombre y trae coordenadas y zona horaria. */
export function BirthForm({ initial, busy, onSave, onSkip, saveLabel = 'Calcular mi carta' }: { initial?: Birth | null; busy?: boolean; onSave: (b: Birth) => void; onSkip?: () => void; saveLabel?: string }) {
  const [date, setDate] = useState(initial?.date || '');
  const [time, setTime] = useState(initial?.time || '');
  const [noTime, setNoTime] = useState(initial ? !initial.time : false);
  const [q, setQ] = useState(initial?.place || '');
  const [place, setPlace] = useState<Place | null>(initial ? { name: initial.place, label: initial.place, lat: initial.lat, lon: initial.lon, tz: initial.tz } : null);
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState('');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (place && q === place.label) { setResults([]); return; }
    window.clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); return; }
    timer.current = window.setTimeout(async () => {
      setSearching(true);
      try { setResults(await searchPlaces(q)); setErr(''); } catch { setErr('No se pudo buscar el lugar. Revisa tu conexión.'); }
      setSearching(false);
    }, 350);
    return () => window.clearTimeout(timer.current);
  }, [q, place]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) { setErr('Falta la fecha.'); return; }
    if (!noTime && !time) { setErr('Falta la hora, o marca que no la sabes.'); return; }
    if (!place) { setErr('Elige tu lugar de nacimiento de la lista.'); return; }
    onSave({ date, time: noTime ? null : time, place: place.label, lat: place.lat, lon: place.lon, tz: place.tz });
  }

  return (
    <form className="birth-form" onSubmit={submit}>
      <div className="birth-row">
        <label className="field">Fecha<input type="date" required value={date} max={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} /></label>
        <label className="field">Hora<input type="time" value={time} disabled={noTime} onChange={e => setTime(e.target.value)} /></label>
      </div>
      <label className="check"><input type="checkbox" checked={noTime} onChange={e => setNoTime(e.target.checked)} /> No sé la hora exacta <span className="fine">(sin hora no hay Ascendente ni casas)</span></label>
      <div className="field place-field">
        <label htmlFor="birth-place">Lugar de nacimiento</label>
        <div className="search"><Icon name="search" size={18} /><input id="birth-place" autoComplete="off" placeholder="Ciudad" value={q} onChange={e => { setQ(e.target.value); setPlace(null); }} role="combobox" aria-expanded={results.length > 0} aria-controls="birth-results" /></div>
        {searching && <p className="fine">Buscando…</p>}
        {results.length > 0 && (
          <ul className="place-results" id="birth-results" role="listbox">
            {results.map(r => <li key={`${r.lat},${r.lon}`}><button type="button" role="option" aria-selected={false} onClick={() => { setPlace(r); setQ(r.label); setResults([]); }}>{r.label}</button></li>)}
          </ul>
        )}
        {place && <p className="fine">✓ {place.label} · {place.tz}</p>}
      </div>
      <p className="auth-err" aria-live="polite">{err}</p>
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Calculando…' : saveLabel}</button>
      {onSkip && <button type="button" className="btn btn-ghost btn-block" onClick={onSkip} disabled={busy}>Lo hago después en Ajustes</button>}
    </form>
  );
}
