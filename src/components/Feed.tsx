import { useMemo, useState } from 'react';
import type { Ctx } from '../App';
import { CARDS, energyLine, posOf, validCards, type Reading } from '../lib/tarot';
import { EMOJIS, type Profile } from '../lib/types';
import { SIGN_GLYPH, SIGNS } from '../lib/astro';
import { repo } from '../lib/repo';
import { TarotCard, Icon, Avatar } from './ui';

const big = (p: Profile, n: string) => p.natal?.find(x => x[0] === n)?.[1] || null;

/** Sol, Luna y Ascendente en chips pequeños. */
export function BigThree({ p }: { p: Profile }) {
  const items: [string, string | null][] = [['☉', big(p, 'Sol')], ['☽', big(p, 'Luna')], ['↑', big(p, 'Ascendente')]];
  if (!items.some(x => x[1])) return <span className="big3 muted">Sin carta natal</span>;
  return (
    <span className="big3" aria-label={`Sol ${items[0][1] || '—'}, Luna ${items[1][1] || '—'}, Ascendente ${items[2][1] || '—'}`}>
      {items.map(([g, s]) => s && <span key={g} className="b3"><b aria-hidden="true">{g}</b>{SIGN_GLYPH[SIGNS.indexOf(s)]} {s}</span>)}
    </span>
  );
}

export function relDate(r: Reading) {
  const [y, m, d] = r.date.split('-').map(Number), dt = new Date(y, m - 1, d), now = new Date();
  const diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - dt.getTime()) / 864e5);
  if (diff === 0) return 'hoy'; if (diff === 1) return 'ayer'; if (diff < 7) return `hace ${diff} días`;
  return dt.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export function Feed({ ctx }: { ctx: Ctx }) {
  const { snap } = ctx;
  const [filter, setFilter] = useState<'all' | 'friends'>('all');
  const byId = useMemo(() => new Map(snap.members.map(m => [m.id, m])), [snap.members]);
  const list = useMemo(() => snap.readings
    .filter(r => byId.has(r.user_id) && (filter === 'all' || r.user_id !== snap.me!.id))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.created_at || '').localeCompare(a.created_at || '')))
    .slice(0, 40), [snap.readings, byId, filter, snap.me]);
  const friends = snap.friendships.filter(f => f.status === 'accepted').length;

  return (
    <section className="feed" aria-labelledby="feed-title">
      <div className="section-head">
        <h2 id="feed-title" className="h2">Tus amigos</h2>
        <div className="seg seg-sm" role="group" aria-label="Filtrar feed">
          <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Todo</button>
          <button type="button" aria-pressed={filter === 'friends'} onClick={() => setFilter('friends')}>Solo amigos</button>
        </div>
      </div>
      {friends === 0 && (
        <div className="feed-empty panel">
          <p><b>Todavía no tienes amigos en Taro.</b></p>
          <p className="muted">Busca a alguien por su usuario o comparte tu link para que te agreguen.</p>
          <button className="btn btn-primary btn-sm" onClick={() => ctx.go('amigos', snap.me!.handle)}><Icon name="user" size={18} />Agregar amigos</button>
        </div>
      )}
      <ol className="feed-list">
        {list.map(r => <li key={r.id}><FeedCard ctx={ctx} r={r} owner={byId.get(r.user_id)!} /></li>)}
      </ol>
    </section>
  );
}

export function FeedCard({ ctx, r, owner }: { ctx: Ctx; r: Reading; owner: Profile }) {
  const { snap } = ctx, meId = snap.me!.id, mine = owner.id === meId;
  const reactions = snap.reactions.filter(x => x.reading_id === r.id);
  const comments = snap.comments.filter(c => c.reading_id === r.id);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const byId = new Map(snap.members.map(m => [m.id, m]));
  const cards = validCards(r);
  const showNote = r.note && (mine || !r.note_private);

  async function react(e: string) {
    const on = !reactions.some(x => x.user_id === meId && x.emoji === e);
    try { await repo.toggleReaction(r.id, e, on); await ctx.refresh(); } catch { setErr('No se pudo reaccionar.'); }
  }
  async function send(ev: React.FormEvent) {
    ev.preventDefault(); const body = text.trim(); if (!body) return;
    setBusy(true); setErr('');
    try { await repo.comment(r.id, body); setText(''); setOpen(true); await ctx.refresh(); } catch { setErr('No se pudo comentar.'); }
    setBusy(false);
  }
  async function del(id: string) { try { await repo.deleteComment(id); await ctx.refresh(); } catch { setErr('No se pudo borrar.'); } }

  return (
    <article className="fcard" id={`r-${r.id}`} style={{ '--who': owner.accent } as React.CSSProperties}>
      <header className="fcard-head">
        <button type="button" className="fcard-who" onClick={() => ctx.go('hoy', owner.handle)} aria-label={`Ver perfil de ${owner.display_name}`}>
          <Avatar name={owner.display_name} accent={owner.accent} kind={owner.avatar} size={40} />
          <span><b>{mine ? 'Tú' : owner.display_name}</b><BigThree p={owner} /></span>
        </button>
        <span className="fcard-when">{relDate(r)}{r.visibility === 'private' && <span className="chip chip-lock" title="Solo tú la ves">🔒 Privada</span>}</span>
      </header>
      <p className="fcard-energy">{energyLine(r)}</p>
      <div className="fcard-cards">
        {cards.map((x, i) => <figure key={i}><TarotCard card={x} size="sm" i={i} /><figcaption>{posOf(r, i)}<span>{CARDS[x.c].name}</span></figcaption></figure>)}
      </div>
      {showNote && <p className="fcard-note">{r.note}{mine && r.note_private && <span className="fine"> · nota solo para ti</span>}</p>}
      {r.tags.length > 0 && <div className="chips-row">{r.tags.map(t => <span key={t} className="chip">{t}</span>)}</div>}

      <div className="fcard-react" role="group" aria-label="Reacciones">
        {EMOJIS.map(e => {
          const n = reactions.filter(x => x.emoji === e).length, on = reactions.some(x => x.user_id === meId && x.emoji === e);
          const who = reactions.filter(x => x.emoji === e).map(x => byId.get(x.user_id)?.display_name).filter(Boolean).join(', ');
          return <button key={e} type="button" className={`emoji${on ? ' on' : ''}${n ? ' has' : ''}`} aria-pressed={on} title={who || 'Reaccionar'} onClick={() => react(e)}><span aria-hidden="true">{e}</span>{n > 0 && <b>{n}</b>}</button>;
        })}
        <span className="emoji comments-toggle" aria-label={`${comments.length} comentarios`}><Icon name="comment" size={18} />{comments.length > 0 && <b>{comments.length}</b>}</span>
      </div>

      <div className="fcard-comments">
          {comments.length > 2 && !open && <button type="button" className="link more-cmts" onClick={() => setOpen(true)}>Ver los {comments.length} comentarios</button>}
          {(open ? comments : comments.slice(-2)).map(c => {
            const a = byId.get(c.user_id);
            return (
              <div key={c.id} className="cmt">
                <Avatar name={a?.display_name || '?'} accent={a?.accent || '#ccc'} kind={a?.avatar} size={28} />
                <p><b>{a ? (a.id === meId ? 'Tú' : a.display_name) : 'Alguien'}</b> {c.body}</p>
                {(c.user_id === meId || mine) && <button type="button" className="icon-btn icon-btn-sm" aria-label="Borrar comentario" onClick={() => del(c.id)}><Icon name="close" size={14} /></button>}
              </div>
            );
          })}
          <form className="cmt-form" onSubmit={send}>
            <Avatar name={snap.me!.display_name} accent={snap.me!.accent} kind={snap.me!.avatar} size={30} />
            <input value={text} maxLength={500} onChange={e => setText(e.target.value)} placeholder={mine ? 'Escribe un comentario…' : `Comenta la tirada de ${owner.display_name}…`} aria-label="Comentario" />
            <button className="btn btn-primary btn-sm" disabled={busy || !text.trim()} aria-label="Enviar comentario"><Icon name="right" size={18} /></button>
          </form>
        </div>
      {err && <p className="auth-err">{err}</p>}
    </article>
  );
}
