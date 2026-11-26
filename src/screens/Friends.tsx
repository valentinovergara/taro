import { useEffect, useMemo, useRef, useState } from 'react';
import type { Ctx } from '../App';
import { repo } from '../lib/repo';
import type { ProfileHit } from '../lib/types';
import { SIGN_GLYPH, SIGNS } from '../lib/astro';
import { Avatar, Icon } from '../components/ui';
import { BigThree } from '../components/Feed';
import { Character } from '../components/Character';

const sg = (s: string | null) => (s ? `${SIGN_GLYPH[SIGNS.indexOf(s)]} ${s}` : '—');

export function Friends({ ctx, addHandle }: { ctx: Ctx; addHandle?: string | null }) {
  const { snap } = ctx, me = snap.me!;
  const byId = useMemo(() => new Map(snap.members.map(m => [m.id, m])), [snap.members]);
  const accepted = snap.friendships.filter(f => f.status === 'accepted');
  const incoming = snap.friendships.filter(f => f.status === 'pending' && f.addressee === me.id);
  const outgoing = snap.friendships.filter(f => f.status === 'pending' && f.requester === me.id);
  const other = (f: { requester: string; addressee: string }) => byId.get(f.requester === me.id ? f.addressee : f.requester);
  const [q, setQ] = useState(addHandle || ''); const [hits, setHits] = useState<ProfileHit[]>([]); const [msg, setMsg] = useState(''); const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const link = `${window.location.origin}${window.location.pathname}#/agregar/${me.handle}`;

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (q.trim().length < 2) { setHits([]); return; }
    timer.current = window.setTimeout(async () => { try { setHits(await repo.searchProfiles(q.trim().replace(/^@/, ''))); } catch { setMsg('No se pudo buscar.'); } }, 300);
    return () => window.clearTimeout(timer.current);
  }, [q, snap.friendships]);

  const act = async (f: () => Promise<unknown>, ok: string) => { setMsg(''); try { await f(); await ctx.refresh(); setMsg(ok); if (q) setHits(await repo.searchProfiles(q.trim())); } catch { setMsg('Algo salió mal. Intenta de nuevo.'); } };
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); } };

  return (
    <div className="screen friends">
      <header><p className="eyebrow">Tu gente en Taro</p><h1 className="h-display">Amigos</h1></header>

      <div className="friends-grid">
        <section className="panel">
          <h3>Agregar amigos</h3>
          <label className="search" style={{ marginTop: 12 }}><Icon name="search" size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Busca por usuario o nombre" aria-label="Buscar personas" /></label>
          {hits.length > 0 && (
            <ul className="people">
              {hits.map(h => (
                <li key={h.id} className="person">
                  <Avatar name={h.display_name} accent={h.accent} size={40} />
                  <span className="person-info"><b>{h.display_name}</b><span className="fine">@{h.handle} · ☉ {sg(h.sun)} · ☽ {sg(h.moon)} · ↑ {sg(h.asc_sign)}</span></span>
                  {h.relation === 'none' && <button className="btn btn-primary btn-sm" onClick={() => act(() => repo.requestFriend(h.id), `Solicitud enviada a ${h.display_name}.`)}>Agregar</button>}
                  {h.relation === 'sent' && <span className="chip">Enviada</span>}
                  {h.relation === 'received' && <button className="btn btn-primary btn-sm" onClick={() => act(() => repo.requestFriend(h.id), `Ahora eres amigo de ${h.display_name}.`)}>Aceptar</button>}
                  {h.relation === 'friend' && <span className="chip chip-soft">Amigos</span>}
                </li>
              ))}
            </ul>
          )}
          {q.trim().length >= 2 && hits.length === 0 && <p className="fine" style={{ marginTop: 10 }}>Nadie con ese nombre todavía.</p>}
          <div className="invite">
            <p><b>O comparte tu link</b></p>
            <p className="fine">Quien lo abra podrá crear su cuenta y agregarte de una vez.</p>
            <div className="link-row"><code>{link}</code><button className="btn btn-sm" onClick={copy}><Icon name="link" size={18} />{copied ? 'Copiado' : 'Copiar'}</button></div>
          </div>
          <p className="fine" aria-live="polite" style={{ marginTop: 8 }}>{msg}</p>
        </section>

        <section className="panel">
          {incoming.length > 0 && <>
            <h3>Solicitudes para ti</h3>
            <ul className="people">
              {incoming.map(f => { const p = other(f); if (!p) return null; return (
                <li key={f.id} className="person">
                  <Avatar name={p.display_name} accent={p.accent} kind={p.avatar} size={40} />
                  <span className="person-info"><b>{p.display_name}</b><BigThree p={p} /></span>
                  <button className="btn btn-primary btn-sm" onClick={() => act(() => repo.acceptFriend(f.id), `Ahora eres amigo de ${p.display_name}.`)}>Aceptar</button>
                  <button className="icon-btn icon-btn-sm" aria-label={`Rechazar a ${p.display_name}`} onClick={() => act(() => repo.removeFriend(f.id), 'Solicitud rechazada.')}><Icon name="close" size={16} /></button>
                </li>); })}
            </ul>
          </>}
          <h3 style={{ marginTop: incoming.length ? 22 : 0 }}>Tus amigos <span className="muted">({accepted.length})</span></h3>
          {accepted.length === 0 && <div className="empty"><Character kind="star" size={110} className="float" /><p>Aún no tienes amigos agregados.</p></div>}
          <ul className="people">
            {accepted.map(f => { const p = other(f); if (!p) return null; return (
              <li key={f.id} className="person">
                <button type="button" className="person-main" onClick={() => ctx.go('hoy', p.handle)}>
                  <Avatar name={p.display_name} accent={p.accent} kind={p.avatar} size={44} />
                  <span className="person-info"><b>{p.display_name}</b><span className="fine">@{p.handle}</span><BigThree p={p} /></span>
                </button>
                <FriendMenu onRemove={() => act(() => repo.removeFriend(f.id), `Ya no eres amigo de ${p.display_name}.`)} name={p.display_name} />
              </li>); })}
          </ul>
          {outgoing.length > 0 && <>
            <h3 style={{ marginTop: 22 }}>Solicitudes enviadas</h3>
            <ul className="people">
              {outgoing.map(f => { const p = other(f); if (!p) return null; return (
                <li key={f.id} className="person">
                  <Avatar name={p.display_name} accent={p.accent} kind={p.avatar} size={36} />
                  <span className="person-info"><b>{p.display_name}</b><span className="fine">Esperando respuesta</span></span>
                  <button className="btn btn-ghost btn-sm" onClick={() => act(() => repo.removeFriend(f.id), 'Solicitud cancelada.')}>Cancelar</button>
                </li>); })}
            </ul>
          </>}
        </section>
      </div>
    </div>
  );
}

function FriendMenu({ onRemove, name }: { onRemove: () => void; name: string }) {
  const [arm, setArm] = useState(false);
  return arm
    ? <span className="row-btns"><button className="btn btn-danger btn-sm" onClick={onRemove}>Quitar</button><button className="btn btn-ghost btn-sm" onClick={() => setArm(false)}>No</button></span>
    : <button className="icon-btn icon-btn-sm" aria-label={`Quitar a ${name} de tus amigos`} title="Quitar amigo" onClick={() => setArm(true)}><Icon name="close" size={16} /></button>;
}
