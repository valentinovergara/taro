import { useMemo, useState } from 'react';
import type { Ctx } from '../App';
import { CARDS, posOf, SUIT_LABEL, SUIT_ORDER, validCards, type Suit } from '../lib/tarot';
import { TarotCard, Icon, SuitDot } from '../components/ui';
import { Character } from '../components/Character';

const pd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

export function History({ ctx }: { ctx: Ctx }) {
  const [tag, setTag] = useState<string | null>(null);
  const [suit, setSuit] = useState<Suit | null>(null);
  const [q, setQ] = useState('');
  const list = useMemo(() => ctx.readings.filter(r =>
    (!tag || r.tags.includes(tag)) &&
    (!suit || validCards(r).some(x => CARDS[x.c].suit === suit)) &&
    (!q || (r.note + ' ' + validCards(r).map(x => CARDS[x.c].name).join(' ')).toLowerCase().includes(q.toLowerCase()))
  ), [ctx.readings, tag, suit, q]);
  const groups = useMemo(() => {
    const g: { key: string; label: string; items: typeof list }[] = [];
    list.forEach(r => { const k = r.date.slice(0, 7); let e = g.find(x => x.key === k); if (!e) { e = { key: k, label: pd(r.date).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }), items: [] }; g.push(e); } e.items.push(r); });
    return g;
  }, [list]);

  return (
    <div className="screen history">
      <header>
        <p className="eyebrow">Historial de {ctx.viewed.display_name}</p>
        <h1 className="h-display">Todas las tiradas</h1>
      </header>
      <div className="filters">
        <label className="search"><Icon name="search" size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar carta o nota" aria-label="Buscar" /></label>
        <div className="chips-row" role="group" aria-label="Filtrar por tema">
          <button className="chip-btn" aria-pressed={!tag} onClick={() => setTag(null)}>Todos</button>
          {ctx.viewed.tags.map(t => <button key={t} className="chip-btn" aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>{t}</button>)}
        </div>
        <div className="chips-row" role="group" aria-label="Filtrar por palo">
          {SUIT_ORDER.map(s => <button key={s} className="chip-btn" aria-pressed={suit === s} onClick={() => setSuit(suit === s ? null : s)}><SuitDot suit={s} />{SUIT_LABEL[s]}</button>)}
        </div>
      </div>

      {!list.length && <div className="empty"><Character kind="moon" mood="sleepy" size={130} className="float" /><p>No hay tiradas con esos filtros.</p></div>}

      {groups.map(g => (
        <section key={g.key} className="timeline">
          <h2 className="timeline-month">{g.label}</h2>
          <ol>
            {g.items.map(r => {
              const d = pd(r.date);
              return (
                <li key={r.id} className="tl-item">
                  <div className="tl-date"><b>{d.getDate()}</b><span>{d.toLocaleDateString('es-CO', { weekday: 'short' })}</span></div>
                  <article className="tl-card">
                    <div className="tl-cards">{validCards(r).map((x, i) => <TarotCard key={i} card={x} size="sm" i={i} />)}</div>
                    <p className="tl-names">{validCards(r).map((x, i) => `${posOf(r, i)}: ${CARDS[x.c].name}${x.r ? ' (inv.)' : ''}`).join(' · ')}</p>
                    {r.note && <p className="tl-note">{r.note}</p>}
                    <div className="tl-foot">
                      <div className="chips-row">{r.tags.map(t => <span key={t} className="chip chip-soft">{t}</span>)}</div>
                      {ctx.isMine && <button className="btn btn-ghost btn-sm" onClick={() => ctx.openSheet(r)}><Icon name="edit" size={18} />Editar</button>}
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
