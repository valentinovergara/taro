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
  const [shared, setShared] = useState((reading?.visibility || 'friends') === 'friends');
  const [notePrivate, setNotePrivate] = useState(!!reading?.note_private);
  const [picking, setPicking] = useState<number | null>(null);
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [arm, setArm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'random' | 'manual'>(reading ? 'manual' : 'random');
  const [count, setCount] = useState(3); const [allowRev, setAllowRev] = useState(true);
  const [phase, setPhase] = useState<'idle' | 'shuffling' | 'dealt'>('idle'); const [dealKey, setDealKey] = useState(0);
  function shuffleDeal() {
    setPhase('shuffling'); setMsg('');
    const ids = CARD_LIST.map(c => c.id), rnd = new Uint32Array(ids.length + count);
    crypto.getRandomValues(rnd);
    for (let i = ids.length - 1; i > 0; i--) { const j = rnd[i] % (i + 1); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    const drawn = ids.slice(0, count).map((c, k) => ({ c, r: allowRev && rnd[ids.length + k] % 4 === 0 }));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => { setCards(drawn); setPhase('dealt'); setDealKey(k => k + 1); }, reduce ? 0 : 900);
  }
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') picking !== null ? setPicking(null) : onClose(); };
    window.addEventListener('keydown', f); ref.current?.querySelector<HTMLElement>('input,button')?.focus();
    document.body.classList.add('no-scroll');
    return () => { window.removeEventListener('keydown', f); document.body.classList.remove('no-scroll'); };
  }, [onClose, picking]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const cs = cards.filter(x => x.c);
    if (cs.length < 3) { setMsg(mode === 'random' ? 'Primero baraja y reparte.' : 'Elige al menos 3 cartas.'); return; }
    setBusy(true);
    try { await repo.saveReading({ id: reading?.id, date, cards: cs, positions: reading?.positions ?? null, tags, note: note.trim(), visibility: shared ? 'friends' : 'private', note_private: shared && notePrivate }); await ctx.refresh(); onClose(); }
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

          <div className="seg mode-seg" role="group" aria-label="Tipo de tirada">
            <button type="button" aria-pressed={mode === 'random'} onClick={() => setMode('random')}><Icon name="shuffle" size={18} />Tirar aquí</button>
            <button type="button" aria-pressed={mode === 'manual'} onClick={() => setMode('manual')}><Icon name="edit" size={18} />Registrar mis cartas</button>
          </div>
          {mode === 'random' && (
            <div className="random-panel">
              <div className={`deck${phase === 'shuffling' ? ' is-shuffling' : ''}`} aria-hidden="true">{[0, 1, 2, 3, 4].map(i => <span key={i} className="deck-card" style={{ '--k': i } as React.CSSProperties} />)}</div>
              <div className="random-opts">
                <span className="fine">¿Cuántas cartas?</span>
                <div className="chips-row">{[3, 4, 5, 6].map(n => <button type="button" key={n} className="chip-btn" aria-pressed={count === n} onClick={() => setCount(n)}>{n}</button>)}</div>
                <label className="check"><input type="checkbox" checked={allowRev} onChange={e => setAllowRev(e.target.checked)} /> Pueden salir invertidas</label>
                <button type="button" className="btn btn-primary" onClick={shuffleDeal} disabled={phase === 'shuffling'}><Icon name="shuffle" size={18} />{phase === 'shuffling' ? 'Barajando…' : phase === 'dealt' ? 'Volver a tirar' : 'Barajar y repartir'}</button>
              </div>
            </div>
          )}
          {(mode === 'manual' || phase === 'dealt') && <div className="field"><span>{mode === 'random' ? 'Tus cartas' : 'Cartas, en el orden en que salieron'}</span>
            <div className="pick-row">
              {cards.map((x, i) => {
                const c = CARDS[x.c];
                return (
                  <div key={i} className="pick-slot">
                    <span className="pick-label">{posOf(reading, i)}</span>
                    <button type="button" key={`${dealKey}-${i}`} style={{ '--i': i } as React.CSSProperties} className={`pick-card${c ? ' has' : ''}${x.r ? ' is-rev' : ''}${mode === 'random' && phase === 'dealt' ? ' is-reveal' : ''}`} onClick={() => setPicking(i)} aria-label={c ? `Cambiar ${c.name}` : `Elegir carta de ${posOf(reading, i)}`}>
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
          </div>}

          <div className="field"><span>¿Sobre qué preguntaste?</span>
            <div className="chips-row">{ctx.viewed.tags.map(t => <button type="button" key={t} className="chip-btn" aria-pressed={tags.includes(t)} onClick={() => setTags(tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t])}>{t}</button>)}</div>
          </div>
          <label className="field">Nota<textarea rows={5} value={note} onChange={e => setNote(e.target.value)} placeholder="Qué sentiste al verlas, qué pasó hoy…" /></label>
          <fieldset className="privacy">
            <legend>¿Quién la ve?</legend>
            <div className="seg" role="group" aria-label="Visibilidad">
              <button type="button" aria-pressed={shared} onClick={() => setShared(true)}><Icon name="users" size={18} />Mis amigos</button>
              <button type="button" aria-pressed={!shared} onClick={() => setShared(false)}><Icon name="lock" size={18} />Solo yo</button>
            </div>
            {shared && <label className="check"><input type="checkbox" checked={notePrivate} onChange={e => setNotePrivate(e.target.checked)} /> Compartir las cartas pero dejar mi nota solo para mí</label>}
            <p className="fine">{shared ? (notePrivate ? 'Tus amigos ven las cartas y pueden reaccionar; tu nota es privada.' : 'Tus amigos ven las cartas y tu nota, y pueden reaccionar y comentar.') : 'Nadie más la verá. No aparece en el feed de tus amigos.'}</p>
          </fieldset>
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
