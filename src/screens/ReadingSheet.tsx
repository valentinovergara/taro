import { useEffect, useMemo, useRef, useState } from 'react';
import type { Ctx } from '../App';
import { CARD_LIST, CARDS, POSITIONS, SUIT_LABEL, SUIT_ORDER, cardImg, posOf, validCards, type DrawnCard, type Reading, type Suit } from '../lib/tarot';
import { Icon, SuitDot } from '../components/ui';
import { repo } from '../lib/repo';
import { todayIso } from './Today';

export function ReadingSheet({ ctx, reading, onClose }: { ctx: Ctx; reading: Reading | null; onClose: () => void }) {
  const [date, setDate] = useState(reading?.date || todayIso());
  const [cards, setCards] = useState<DrawnCard[]>(() => { const c = reading ? validCards(reading).map(x => ({ ...x })) : []; while (c.length < 3) c.push({ c: '' }); return c; });
  const [tags, setTags] = useState<string[]>(reading?.tags || []);
  const [note, setNote] = useState(reading?.note || '');
  const [picking, setPicking] = useState<number | null>(null);
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [arm, setArm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') picking !== null ? setPicking(null) : onClose(); };
    window.addEventListener('keydown', f); ref.current?.querySelector<HTMLElement>('input,button')?.focus();
    document.body.classList.add('no-scroll');
    return () => { window.removeEventListener('keydown', f); document.body.classList.remove('no-scroll'); };
  }, [onClose, picking]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const cs = cards.filter(x => x.c);
    if (cs.length < 3) { setMsg('Elige al menos 3 cartas.'); return; }
    setBusy(true);
    try { await repo.saveReading({ id: reading?.id, date, cards: cs, positions: reading?.positions ?? null, tags, note: note.trim() }); await ctx.refresh(); onClose(); }
    catch { setMsg('No se pudo guardar. Revisa tu conexión.'); }
    setBusy(false);
  }
  async function del() {
    if (!reading) return; if (!arm) { setArm(true); return; }
    try { await repo.deleteReading(reading.id); await ctx.refresh(); onClose(); } catch { setMsg('No se pudo borrar.'); }
  }

  return (
    <div className="sheet-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="rs-title" ref={ref}>
        <span className="sheet-grip" aria-hidden="true" />
        <button className="icon-btn sheet-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
        <form onSubmit={save}>
          <h2 id="rs-title" className="sheet-title">{reading ? 'Editar tirada' : 'Nueva tirada'}</h2>
          <label className="field">Fecha<input type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>

          <div className="field"><span>Cartas, en el orden en que salieron</span>
            <div className="pick-row">
              {cards.map((x, i) => {
                const c = CARDS[x.c];
                return (
                  <div key={i} className="pick-slot">
                    <span className="pick-label">{posOf(reading, i)}</span>
                    <button type="button" className={`pick-card${c ? ' has' : ''}${x.r ? ' is-rev' : ''}`} onClick={() => setPicking(i)} aria-label={c ? `Cambiar ${c.name}` : `Elegir carta de ${posOf(reading, i)}`}>
                      {c ? <img src={cardImg(c.id)} alt="" /> : <Icon name="plus" size={26} />}
                    </button>
                    {c && <button type="button" className={`rev-toggle${x.r ? ' on' : ''}`} aria-pressed={!!x.r} onClick={() => setCards(cards.map((y, k) => k === i ? { ...y, r: !y.r } : y))}><Icon name="flip" size={16} />Invertida</button>}
                  </div>
                );
              })}
            </div>
            <div className="row-btns">
              <button type="button" className="btn btn-ghost btn-sm" disabled={cards.length >= 6} onClick={() => setCards([...cards, { c: '' }])}><Icon name="plus" size={18} />Carta</button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={cards.length <= 3} onClick={() => setCards(cards.slice(0, -1))}>Quitar última</button>
            </div>
          </div>

          <div className="field"><span>¿Sobre qué preguntaste?</span>
            <div className="chips-row">{ctx.viewed.tags.map(t => <button type="button" key={t} className="chip-btn" aria-pressed={tags.includes(t)} onClick={() => setTags(tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t])}>{t}</button>)}</div>
          </div>
          <label className="field">Nota<textarea rows={5} value={note} onChange={e => setNote(e.target.value)} placeholder="Qué sentiste al verlas, qué pasó hoy…" /></label>
          <p className="fine" aria-live="polite">{msg}</p>
          <div className="sheet-actions">
            {reading && <button type="button" className="btn btn-danger" onClick={del}><Icon name="trash" size={18} />{arm ? '¿Seguro? Toca otra vez' : 'Borrar'}</button>}
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar tirada'}</button>
          </div>
        </form>
        {picking !== null && <CardPicker title={POSITIONS[picking] ? posOf(reading, picking) : 'Carta'} onPick={id => { setCards(cards.map((y, k) => k === picking ? { c: id, r: y.r } : y)); setPicking(null); }} onClose={() => setPicking(null)} />}
      </div>
    </div>
  );
}

function CardPicker({ title, onPick, onClose }: { title: string; onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState(''); const [suit, setSuit] = useState<Suit | 'all'>('all');
  const list = useMemo(() => CARD_LIST.filter(c => (suit === 'all' || c.suit === suit) && c.name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(q.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, ''))), [q, suit]);
  return (
    <div className="picker" role="dialog" aria-modal="true" aria-label={`Elegir carta: ${title}`}>
      <div className="picker-head">
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Volver"><Icon name="left" /></button>
        <h3>{title}</h3>
      </div>
      <label className="search"><Icon name="search" size={18} /><input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar carta" aria-label="Buscar carta" /></label>
      <div className="chips-row scroll-x">
        <button type="button" className="chip-btn" aria-pressed={suit === 'all'} onClick={() => setSuit('all')}>Todas</button>
        {SUIT_ORDER.map(s => <button type="button" key={s} className="chip-btn" aria-pressed={suit === s} onClick={() => setSuit(s)}><SuitDot suit={s} />{SUIT_LABEL[s]}</button>)}
      </div>
      <div className="picker-grid">
        {list.map(c => <button type="button" key={c.id} className="picker-item" onClick={() => onPick(c.id)}><img src={cardImg(c.id)} alt="" loading="lazy" /><span>{c.name}</span></button>)}
      </div>
    </div>
  );
}
