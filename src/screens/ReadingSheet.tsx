import { useEffect, useMemo, useRef, useState } from 'react';
import type { Ctx } from '../App';
import { CARD_LIST, CARDS, POSITIONS, SUIT_LABEL, SUIT_ORDER, cardImg, posOf, validCards, type DrawnCard, type Reading, type Suit } from '../lib/tarot';
import { cardInfo, revealText, readingSummary } from '../lib/meanings';
import { Icon, SuitDot } from '../components/ui';
import { MicButton } from '../components/Mic';
import { repo } from '../lib/repo';
import { todayIso } from './Today';

type Step = 'setup' | 'pick' | 'shuffle' | 'reveal' | 'note';

/** Tirada paso a paso: elegir → barajar o registrar → girar cada carta con su significado → nota y privacidad → guardar. */
export function ReadingSheet({ ctx, reading, onClose }: { ctx: Ctx; reading: Reading | null; onClose: () => void }) {
  const editing = !!reading;
  const [step, setStep] = useState<Step>(editing ? 'note' : 'setup');
  const [mode, setMode] = useState<'random' | 'manual'>('random');
  const [count, setCount] = useState(3); const [allowRev, setAllowRev] = useState(true);
  const [date, setDate] = useState(reading?.date || todayIso());
  const [cards, setCards] = useState<DrawnCard[]>(() => reading ? validCards(reading).map(x => ({ ...x })) : []);
  const [revealed, setRevealed] = useState<number>(editing ? 99 : 0);
  const [tags, setTags] = useState<string[]>(reading?.tags || []);
  const [note, setNote] = useState(reading?.note || '');
  const [shared, setShared] = useState((reading?.visibility || 'friends') === 'friends');
  const [notePrivate, setNotePrivate] = useState(!!reading?.note_private);
  const [picking, setPicking] = useState<number | null>(null);
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [arm, setArm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pos = (i: number) => posOf(reading, i);
  const draft: Reading = { id: 'draft', user_id: '', date, cards, positions: reading?.positions ?? null, tags, note };

  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (picking !== null) setPicking(null); else onClose(); } };
    window.addEventListener('keydown', f); document.body.classList.add('no-scroll');
    return () => { window.removeEventListener('keydown', f); document.body.classList.remove('no-scroll'); };
  }, [onClose, picking]);
  useEffect(() => { ref.current?.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  function begin() {
    if (mode === 'manual') { setCards(Array.from({ length: count }, () => ({ c: '' }))); setStep('pick'); return; }
    const ids = CARD_LIST.map(c => c.id), rnd = new Uint32Array(ids.length + count);
    crypto.getRandomValues(rnd);
    for (let i = ids.length - 1; i > 0; i--) { const j = rnd[i] % (i + 1); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    setCards(ids.slice(0, count).map((c, k) => ({ c, r: allowRev && rnd[ids.length + k] % 4 === 0 })));
    setRevealed(0); setStep('shuffle');
    window.setTimeout(() => setStep('reveal'), reduce ? 50 : 2300);
  }
  function confirmPicked() {
    if (cards.some(x => !x.c)) { setMsg('Elige todas las cartas.'); return; }
    setMsg(''); setRevealed(0); setStep('reveal');
  }
  async function save() {
    const cs = cards.filter(x => x.c);
    if (cs.length < 3) { setMsg('La tirada necesita al menos 3 cartas.'); return; }
    setBusy(true); setMsg('');
    try { await repo.saveReading({ id: reading?.id, date, cards: cs, positions: reading?.positions ?? null, tags, note: note.trim(), visibility: shared ? 'friends' : 'private', note_private: shared && notePrivate }); await ctx.refresh(); onClose(); }
    catch { setMsg('No se pudo guardar. Revisa tu conexión e intenta otra vez.'); }
    setBusy(false);
  }
  async function del() {
    if (!reading) return; if (!arm) { setArm(true); return; }
    try { await repo.deleteReading(reading.id); await ctx.refresh(); onClose(); } catch { setMsg('No se pudo borrar.'); }
  }

  const stepsOrder: Step[] = mode === 'manual' ? ['setup', 'pick', 'reveal', 'note'] : ['setup', 'shuffle', 'reveal', 'note'];
  const stepIdx = Math.max(0, stepsOrder.indexOf(step));

  return (
    <div className="sheet-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet wizard" role="dialog" aria-modal="true" aria-labelledby="rs-title" ref={ref}>
        <span className="sheet-grip" aria-hidden="true" />
        <button className="icon-btn sheet-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
        <h2 id="rs-title" className="sheet-title">{editing ? 'Editar tirada' : step === 'setup' ? 'Tu tirada' : step === 'shuffle' ? 'Barajando…' : step === 'pick' ? 'Registra tus cartas' : step === 'reveal' ? 'Gira tus cartas' : 'Guarda tu tirada'}</h2>
        {!editing && <ol className="wiz-steps" aria-label="Pasos">{stepsOrder.map((s, i) => <li key={s} className={i <= stepIdx ? 'done' : ''} aria-current={i === stepIdx ? 'step' : undefined} />)}</ol>}

        {step === 'setup' && (
          <div className="wiz-body">
            <div className="choice-grid">
              <button type="button" className={`choice${mode === 'random' ? ' on' : ''}`} aria-pressed={mode === 'random'} onClick={() => setMode('random')}>
                <Icon name="shuffle" size={26} /><b>Tirar aquí</b><span>Taro baraja y reparte por ti</span>
              </button>
              <button type="button" className={`choice${mode === 'manual' ? ' on' : ''}`} aria-pressed={mode === 'manual'} onClick={() => setMode('manual')}>
                <Icon name="edit" size={26} /><b>Ya tiré mis cartas</b><span>Registra las que te salieron</span>
              </button>
            </div>
            <div className="field"><span>¿Cuántas cartas?</span>
              <div className="chips-row">{[3, 4, 5, 6].map(n => <button type="button" key={n} className="chip-btn" aria-pressed={count === n} onClick={() => setCount(n)}>{n}</button>)}</div>
              <p className="fine">{POSITIONS.slice(0, count).join(' · ')}</p>
            </div>
            {mode === 'random' && <label className="check"><input type="checkbox" checked={allowRev} onChange={e => setAllowRev(e.target.checked)} /> Pueden salir invertidas</label>}
            <label className="field">Fecha<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
            <div className="sheet-actions"><button type="button" className="btn btn-primary" onClick={begin}>{mode === 'random' ? <><Icon name="shuffle" size={18} />Barajar</> : <>Elegir cartas<Icon name="right" size={18} /></>}</button></div>
          </div>
        )}

        {step === 'shuffle' && (
          <div className="wiz-body shuffle-stage" aria-live="polite">
            <div className="deck-big" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={i} className="back-card" style={{ '--k': i } as React.CSSProperties} />)}</div>
            <p className="muted">Respira y piensa en tu pregunta…</p>
          </div>
        )}

        {step === 'pick' && (
          <div className="wiz-body">
            <div className="pick-row">
              {cards.map((x, i) => {
                const c = CARDS[x.c];
                return (
                  <div key={i} className="pick-slot">
                    <span className="pick-label">{pos(i)}</span>
                    <button type="button" className={`pick-card${c ? ' has' : ''}${x.r ? ' is-rev' : ''}`} onClick={() => setPicking(i)} aria-label={c ? `Cambiar ${c.name}` : `Elegir carta de ${pos(i)}`}>
                      {c ? <img src={cardImg(c.id)} alt="" /> : <Icon name="plus" size={26} />}
                    </button>
                    {c && <button type="button" className={`rev-toggle${x.r ? ' on' : ''}`} aria-pressed={!!x.r} onClick={() => setCards(cards.map((y, k) => (k === i ? { ...y, r: !y.r } : y)))}><Icon name="flip" size={16} />Invertida</button>}
                  </div>
                );
              })}
            </div>
            <p className="auth-err">{msg}</p>
            <div className="sheet-actions"><button type="button" className="btn btn-ghost" onClick={() => setStep('setup')}>Atrás</button><button type="button" className="btn btn-primary" onClick={confirmPicked}>Ver mis cartas<Icon name="right" size={18} /></button></div>
          </div>
        )}

        {step === 'reveal' && (
          <div className="wiz-body">
            <p className="muted">{revealed < cards.length ? 'Toca cada carta para girarla.' : 'Esta es tu tirada.'}</p>
            <div className="reveal-row" style={{ '--n': cards.length } as React.CSSProperties}>
              {cards.map((x, i) => {
                const c = CARDS[x.c], open = i < revealed;
                return (
                  <div key={i} className="reveal-slot" style={{ '--i': i } as React.CSSProperties}>
                    <span className="pick-label">{pos(i)}</span>
                    <button type="button" className={`flip-card${open ? ' open' : ''}${x.r ? ' is-rev' : ''}${i === revealed ? ' next' : ''}`} disabled={open || i !== revealed} onClick={() => setRevealed(revealed + 1)} aria-label={open ? c.name : `Girar la carta de ${pos(i)}`}>
                      <span className="fc-inner"><span className="fc-face fc-back" /><span className="fc-face fc-front"><img src={cardImg(c.id)} alt="" /></span></span>
                    </button>
                    {open && <div className="reveal-text"><b>{c.name}{x.r && ' · invertida'}</b><p>{revealText(c, pos(i), x.r)}</p></div>}
                  </div>
                );
              })}
            </div>
            {revealed >= cards.length && <div className="summary-box"><p className="eyebrow">Tu tirada en pocas palabras</p><p>{readingSummary(draft)}</p></div>}
            <div className="sheet-actions">
              {revealed < cards.length ? <button type="button" className="btn btn-ghost" onClick={() => setRevealed(cards.length)}>Girar todas</button> : <button type="button" className="btn btn-primary" onClick={() => setStep('note')}>Continuar<Icon name="right" size={18} /></button>}
            </div>
          </div>
        )}

        {step === 'note' && (
          <div className="wiz-body">
            <div className="mini-spread">{cards.map((x, i) => <span key={i} className={`mini${x.r ? ' is-rev' : ''}`} title={`${pos(i)}: ${CARDS[x.c]?.name}`}><img src={cardImg(x.c)} alt={CARDS[x.c]?.name} /></span>)}</div>
            {editing && <label className="field">Fecha<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>}
            <div className="field"><span>¿Sobre qué preguntaste?</span>
              <div className="chips-row">{ctx.viewed.tags.map(t => <button type="button" key={t} className="chip-btn" aria-pressed={tags.includes(t)} onClick={() => setTags(tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t])}>{t}</button>)}</div>
            </div>
            <div className="field"><span className="note-label">Tu nota <MicButton onText={t => setNote(n => (n ? n.trimEnd() + ' ' : '') + t)} /></span>
              <textarea rows={5} value={note} onChange={e => setNote(e.target.value)} placeholder="¿Qué sentiste al verlas? ¿Qué está pasando hoy?" aria-label="Tu nota" />
            </div>
            <fieldset className="privacy">
              <legend>¿Quién la ve?</legend>
              <div className="seg" role="group" aria-label="Visibilidad">
                <button type="button" aria-pressed={shared} onClick={() => setShared(true)}><Icon name="users" size={18} />Mis amigos</button>
                <button type="button" aria-pressed={!shared} onClick={() => setShared(false)}><Icon name="lock" size={18} />Solo yo</button>
              </div>
              {shared && <label className="check"><input type="checkbox" checked={notePrivate} onChange={e => setNotePrivate(e.target.checked)} /> Compartir las cartas pero dejar mi nota solo para mí</label>}
              <p className="fine">{shared ? (notePrivate ? 'Tus amigos ven las cartas y pueden reaccionar; tu nota queda para ti.' : 'Tus amigos ven las cartas y tu nota, y pueden reaccionar y comentar.') : 'Nadie más la verá. No aparece en el feed.'}</p>
            </fieldset>
            <p className="auth-err" aria-live="polite">{msg}</p>
            <div className="sheet-actions">
              {editing && <button type="button" className="btn btn-danger" onClick={del}><Icon name="trash" size={18} />{arm ? '¿Seguro? Toca otra vez' : 'Borrar'}</button>}
              {!editing && <button type="button" className="btn btn-ghost" onClick={() => setStep('reveal')}>Atrás</button>}
              <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar tirada'}</button>
            </div>
          </div>
        )}
        {picking !== null && <CardPicker title={pos(picking)} onPick={id => { setCards(cards.map((y, k) => (k === picking ? { c: id, r: y.r } : y))); setPicking(null); }} onClose={() => setPicking(null)} />}
      </div>
    </div>
  );
}

function CardPicker({ title, onPick, onClose }: { title: string; onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState(''); const [suit, setSuit] = useState<Suit | 'all'>('all');
  const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const list = useMemo(() => CARD_LIST.filter(c => (suit === 'all' || c.suit === suit) && n(c.name).includes(n(q))), [q, suit]);
  return (
    <div className="picker" role="dialog" aria-modal="true" aria-label={`Elegir carta: ${title}`}>
      <div className="picker-head"><button type="button" className="icon-btn" onClick={onClose} aria-label="Volver"><Icon name="left" /></button><h3>{title}</h3></div>
      <label className="search"><Icon name="search" size={18} /><input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar carta" aria-label="Buscar carta" /></label>
      <div className="chips-row scroll-x">
        <button type="button" className="chip-btn" aria-pressed={suit === 'all'} onClick={() => setSuit('all')}>Todas</button>
        {SUIT_ORDER.map(s => <button type="button" key={s} className="chip-btn" aria-pressed={suit === s} onClick={() => setSuit(s)}><SuitDot suit={s} />{SUIT_LABEL[s]}</button>)}
      </div>
      <div className="picker-grid">
        {list.map(c => <button type="button" key={c.id} className="picker-item" onClick={() => onPick(c.id)} title={cardInfo(c).energy}><img src={cardImg(c.id)} alt="" loading="lazy" /><span>{c.name}</span></button>)}
      </div>
    </div>
  );
}
