import { useState } from 'react';
import type { Ctx } from '../App';
import { CARDS, energyLine, dominantSuit, posOf, validCards, SUIT_LABEL, type Reading } from '../lib/tarot';
import { readingSummary } from '../lib/meanings';
import { Character, SUIT_CHARACTER } from '../components/Character';
import { TarotCard, Icon, Avatar } from '../components/ui';
import { ShareStory } from '../components/ShareStory';
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

  const [share, setShare] = useState(false);
  const friends = ctx.snap.members.filter(m => m.id !== ctx.snap.me!.id);

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
          <div className="mood-art"><Character kind="nebula" size={150} className="float" /></div>
          <div className="mood-copy">
            <span className="chip chip-soft">Hoy</span>
            <h2>Tu mesa está lista.</h2>
            <p>Taro baraja por ti, o registra las cartas que te salieron en tu propio mazo.</p>
            <button className="btn btn-primary" onClick={() => ctx.openSheet()}><Icon name="shuffle" />Hacer mi tirada</button>
          </div>
        </section>
      ) : (
        <section className="board" aria-label="Tu tirada de hoy" style={{ '--suit': `var(--${suit || 'mayor'})` } as React.CSSProperties}>
          <div className="board-cards spread" style={{ '--n': cards.length } as React.CSSProperties}>
            {cards.map((x, i) => {
              const c = CARDS[x.c];
              return (
                <figure className="slot" key={r.id + i}>
                  <figcaption className="slot-label" style={{ '--suit': `var(--${c.suit})` } as React.CSSProperties}>{posOf(r, i)}</figcaption>
                  <TarotCard card={x} i={i} size="lg" deal onClick={() => setDetail({ r, i })} label={`${c.name}: ver qué significa en ${posOf(r, i)}`} />
                  <p className="slot-name">{c.name}{x.r && <span className="muted"> · invertida</span>}</p>
                </figure>
              );
            })}
          </div>
          <div className="board-read">
            <div className="board-mood">
              <Character kind={suit ? SUIT_CHARACTER[suit] : 'nebula'} mood={suit === 'espadas' || suit === 'mayor' ? 'sleepy' : 'happy'} size={76} aura={false} className="float" />
              <div>
                <span className="chip chip-soft">{suit ? SUIT_LABEL[suit] : 'Tu energía'}{(r.tags || []).length ? ` · ${r.tags.join(' · ')}` : ''}</span>
                <h2>{energyLine(r)}</h2>
              </div>
            </div>
            <p className="board-sum">{readingSummary(r)}</p>
            {r.note && <blockquote className="board-note">{r.note}{r.note_private && <span className="fine"><Icon name="lock" size={13} /> solo para ti</span>}</blockquote>}
            <p className="fine board-hint">Toca una carta para leerla con calma.</p>
            <div className="board-actions">
              <button type="button" className="btn btn-primary btn-ig" onClick={() => setShare(true)}><Icon name="insta" size={18} />Compartir en historia</button>
              <button type="button" className="btn btn-ghost" onClick={() => ctx.openSheet(r)}><Icon name="edit" size={18} />Editar</button>
            </div>
          </div>
        </section>
      )}

      <div className="home-cols">
        <div className="home-main"><Feed ctx={ctx} /></div>
        <aside className="home-aside">
          <Recs ctx={ctx} today={r} />
          <section className="panel mini-friends" aria-labelledby="mf-title">
            <div className="section-head"><h3 id="mf-title">Tu gente</h3><button type="button" className="link" onClick={() => ctx.go('amigos', ctx.snap.me!.handle)}>Ver todos</button></div>
            {friends.length === 0 ? <p className="fine">Agrega a tus amigos para ver sus tiradas aquí.</p> : (
              <ul>
                {friends.slice(0, 6).map(f => {
                  const last = ctx.snap.readings.filter(x => x.user_id === f.id).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
                  return (
                    <li key={f.id}><button type="button" onClick={() => ctx.go('hoy', f.handle)}>
                      <Avatar name={f.display_name} accent={f.accent} kind={f.avatar} size={40} />
                      <span><b>{f.display_name}</b><span className="fine">{last ? (last.date === todayIso() ? `Hoy: ${energyLine(last)}` : 'Sin tirada hoy') : 'Aún no comparte tiradas'}</span></span>
                      <Icon name="right" size={16} />
                    </button></li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
      {detail && <CardDetail ctx={ctx} reading={detail.r} index={detail.i} onClose={() => setDetail(null)} />}
      {share && r && <ShareStory reading={r} name={viewed.display_name} onClose={() => setShare(false)} />}
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
