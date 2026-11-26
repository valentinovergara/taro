import { useMemo, useState } from 'react';
import type { Ctx } from '../App';
import { CARDS, energyLine, dominantSuit, posOf, validCards, SUIT_LABEL, type Reading } from '../lib/tarot';
import { Character, SUIT_CHARACTER } from '../components/Character';
import { TarotCard, Icon } from '../components/ui';
import { CardDetail } from './CardDetail';
import { Feed, BigThree } from '../components/Feed';
import { Recs } from '../components/Recs';

const pd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export function Today({ ctx }: { ctx: Ctx }) {
  const { readings, viewed, isMine } = ctx;
  const todayR = readings.find(x => x.date === todayIso()) || null;
  // En mi home solo muestro la de hoy; en el perfil de un amigo, su última tirada.
  const r = isMine ? todayR : todayR || readings[0] || null;
  const [detail, setDetail] = useState<{ r: Reading; i: number } | null>(null);
  const date = r ? pd(r.date) : new Date();
  const isToday = r?.date === todayIso();
  const suit = dominantSuit(r);
  const kind = suit ? SUIT_CHARACTER[suit] : 'nebula';
  const cards = r ? validCards(r) : [];
  const recent = useMemo(() => readings.filter(x => x !== r).slice(0, 4), [readings, r]);

  return (
    <div className="screen today">
      <header className="today-head">
        <p className="eyebrow">{date.toLocaleDateString('es-CO', { weekday: 'long' })}</p>
        <h1 className="hero-date"><span>{date.getDate()}</span> <em>{date.toLocaleDateString('es-CO', { month: 'long' })}</em></h1>
        <p className="sub">{isMine ? (r ? 'Tu tirada de hoy' : `Hola, ${viewed.display_name}. Aún no haces tu tirada de hoy.`) : r ? (isToday ? `La tirada de hoy de ${viewed.display_name}` : `Última tirada de ${viewed.display_name}`) : `${viewed.display_name} aún no comparte tiradas`}</p>
        {!isMine && <BigThree p={viewed} />}
      </header>

      <div className="today-grid">
        <section className="mood-card" aria-label="Energía de la tirada">
          <div className="mood-art"><Character kind={kind} mood={suit === 'espadas' || suit === 'mayor' ? 'sleepy' : 'happy'} size={210} className="float" /></div>
          <div className="mood-copy">
            <span className="chip chip-soft">{suit ? SUIT_LABEL[suit] : 'Sin cartas'}</span>
            <h2>{r ? energyLine(r) : 'Una mesa en blanco.'}</h2>
            <p>{r ? `${cards.length} cartas · ${(r.tags || []).join(' · ') || 'sin tema'}` : isMine ? 'Baraja aquí mismo o registra las cartas que te salieron.' : 'Cuando comparta una tirada aparecerá aquí.'}</p>
            {!r && isMine && <button className="btn btn-primary" onClick={() => ctx.openSheet()}><Icon name="shuffle" />Hacer mi tirada</button>}
          </div>
        </section>

        {r && (
          <section className="spread-wrap" aria-label="Cartas">
            <div className="spread" style={{ '--n': cards.length } as React.CSSProperties}>
              {cards.map((x, i) => {
                const c = CARDS[x.c];
                return (
                  <figure className="slot" key={r.id + i}>
                    <figcaption className="slot-label" style={{ '--suit': `var(--${c.suit})` } as React.CSSProperties}>{posOf(r, i)}</figcaption>
                    <TarotCard card={x} i={i} size="lg" deal onClick={() => setDetail({ r, i })} />
                    <p className="slot-name">{c.name}{x.r && <span className="muted"> · invertida</span>}</p>
                    <p className="slot-kw">{c.kw}</p>
                  </figure>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {r && (r.note || isMine) && (
        <section className="note-card">
          <div className="note-head">
            <h3>Nota</h3>
            {isMine && <button className="btn btn-ghost btn-sm" onClick={() => ctx.openSheet(r)}><Icon name="edit" size={18} />Editar</button>}
          </div>
          {r.note && (isMine || !r.note_private) ? <p className="note-text">{r.note}</p> : <p className="muted">{r.note_private && !isMine ? 'Nota privada.' : 'Sin nota todavía.'}</p>}
          {isMine && r.note_private && <p className="fine" style={{ marginTop: 8 }}><Icon name="lock" size={14} /> Tu nota es solo para ti.</p>}
        </section>
      )}

      {isMine && <Recs ctx={ctx} today={todayR} />}
      {isMine && <Feed ctx={ctx} />}

      {!isMine && recent.length > 0 && (
        <section className="recent">
          <div className="section-head"><h3>Días anteriores</h3><button className="btn btn-ghost btn-sm" onClick={() => ctx.go('historial')}>Ver todo<Icon name="right" size={18} /></button></div>
          <div className="recent-row">
            {recent.map(x => (
              <button key={x.id} className="recent-item" onClick={() => ctx.go('historial')}>
                <span className="recent-date"><b>{pd(x.date).getDate()}</b>{pd(x.date).toLocaleDateString('es-CO', { month: 'short' })}</span>
                <span className="recent-cards">{validCards(x).slice(0, 3).map((c, i) => <TarotCard key={i} card={c} size="xs" />)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {detail && <CardDetail ctx={ctx} reading={detail.r} index={detail.i} onClose={() => setDetail(null)} />}
    </div>
  );
}
