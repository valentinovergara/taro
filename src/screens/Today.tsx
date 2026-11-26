import { useState } from 'react';
import type { Ctx } from '../App';
import { CARDS, energyLine, dominantSuit, posOf, validCards, SUIT_LABEL, type Reading } from '../lib/tarot';
import { readingSummary } from '../lib/meanings';
import { Character, SUIT_CHARACTER } from '../components/Character';
import { TarotCard, Icon } from '../components/ui';
import { CardDetail } from './CardDetail';
import { Feed, FeedCard } from '../components/Feed';
import { Recs } from '../components/Recs';

export const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export function Today({ ctx }: { ctx: Ctx }) {
  return ctx.isMine ? <MyHome ctx={ctx} /> : <FriendReadings ctx={ctx} />;
}

function MyHome({ ctx }: { ctx: Ctx }) {
  const { readings, viewed } = ctx;
  const r = readings.find(x => x.date === todayIso()) || null;
  const [detail, setDetail] = useState<{ r: Reading; i: number } | null>(null);
  const date = new Date();
  const suit = dominantSuit(r);
  const cards = r ? validCards(r) : [];

  return (
    <div className="screen today">
      <header className="today-head">
        <div>
          <p className="eyebrow">{date.toLocaleDateString('es-CO', { weekday: 'long' })}</p>
          <h1 className="hero-date"><span>{date.getDate()}</span> <em>{date.toLocaleDateString('es-CO', { month: 'long' })}</em></h1>
          <p className="sub">{r ? `Tu tirada de hoy, ${viewed.display_name}` : `Hola, ${viewed.display_name}. ¿Qué te dicen las cartas hoy?`}</p>
        </div>
        <button type="button" className="btn btn-primary new-top" data-tour="new" onClick={() => ctx.openSheet()}><Icon name="plus" size={18} />Nueva tirada</button>
      </header>

      {!r ? (
        <section className="mood-card mood-empty" aria-label="Tu tirada de hoy">
          <div className="mood-art"><Character kind="nebula" size={210} className="float" /></div>
          <div className="mood-copy">
            <span className="chip chip-soft">Hoy</span>
            <h2>Tu mesa está lista.</h2>
            <p>Taro baraja por ti, o registra las cartas que te salieron en tu propio mazo.</p>
            <button className="btn btn-primary" onClick={() => ctx.openSheet()}><Icon name="shuffle" />Hacer mi tirada</button>
          </div>
        </section>
      ) : (
        <>
          <div className="today-grid">
            <section className="mood-card" aria-label="Energía de la tirada">
              <div className="mood-art"><Character kind={suit ? SUIT_CHARACTER[suit] : 'nebula'} mood={suit === 'espadas' || suit === 'mayor' ? 'sleepy' : 'happy'} size={210} className="float" /></div>
              <div className="mood-copy">
                <span className="chip chip-soft">{suit ? SUIT_LABEL[suit] : ''}</span>
                <h2>{energyLine(r)}</h2>
                <p>{cards.length} cartas · {(r.tags || []).join(' · ') || 'sin tema'}</p>
              </div>
            </section>
            <section className="spread-wrap" aria-label="Cartas">
              <div className="spread" style={{ '--n': cards.length } as React.CSSProperties}>
                {cards.map((x, i) => {
                  const c = CARDS[x.c];
                  return (
                    <figure className="slot" key={r.id + i}>
                      <figcaption className="slot-label" style={{ '--suit': `var(--${c.suit})` } as React.CSSProperties}>{posOf(r, i)}</figcaption>
                      <TarotCard card={x} i={i} size="lg" deal onClick={() => setDetail({ r, i })} label={`${c.name}: ver qué significa en ${posOf(r, i)}`} />
                      <p className="slot-name">{c.name}{x.r && <span className="muted"> · invertida</span>}</p>
                      <p className="slot-kw">Toca para leerla</p>
                    </figure>
                  );
                })}
              </div>
            </section>
          </div>
          <section className="note-card summary-card">
            <div className="note-head"><h3>Lo que dice tu tirada</h3><button className="btn btn-ghost btn-sm" onClick={() => ctx.openSheet(r)}><Icon name="edit" size={18} />Editar</button></div>
            <p className="note-text">{readingSummary(r)}</p>
            {r.note && <><h3 style={{ marginTop: 18 }}>Tu nota</h3><p className="note-text plain">{r.note}</p></>}
            {r.note_private && <p className="fine" style={{ marginTop: 8 }}><Icon name="lock" size={14} /> Tu nota es solo para ti.</p>}
          </section>
        </>
      )}

      <Recs ctx={ctx} today={r} />
      <Feed ctx={ctx} />
      {detail && <CardDetail ctx={ctx} reading={detail.r} index={detail.i} onClose={() => setDetail(null)} />}
    </div>
  );
}

function FriendReadings({ ctx }: { ctx: Ctx }) {
  const { readings, viewed } = ctx;
  return (
    <div className="screen friend-readings">
      {readings.length === 0
        ? <div className="empty"><Character kind="moon" mood="sleepy" size={130} className="float" /><p>{viewed.display_name} todavía no comparte tiradas contigo.</p></div>
        : <ol className="feed-list">{readings.slice(0, 30).map(r => <li key={r.id}><FeedCard ctx={ctx} r={r} owner={viewed} /></li>)}</ol>}
    </div>
  );
}
