import { useEffect, useMemo, useRef, useState } from 'react';
import type { Ctx } from '../App';
import { Avatar, Icon } from './ui';

interface Notif { id: string; at: string; who: string; text: string; go: () => void }

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'ahora'; if (m < 60) return `hace ${m} min`; const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24); return d === 1 ? 'ayer' : `hace ${d} días`;
};

/** Campanita: reacciones y comentarios en tus tiradas, y solicitudes de amistad. */
export function Bell({ ctx }: { ctx: Ctx }) {
  const { snap } = ctx, me = snap.me!;
  const key = `taro-notif-seen-${me.id}`;
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem(key) || ''; } catch { return ''; } });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(snap.members.map(m => [m.id, m])), [snap.members]);

  const items = useMemo<Notif[]>(() => {
    const mine = new Set(snap.readings.filter(r => r.user_id === me.id).map(r => r.id));
    const toReading = (rid: string) => () => { ctx.go('hoy'); window.setTimeout(() => document.getElementById(`r-${rid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); };
    const out: Notif[] = [];
    snap.reactions.filter(x => mine.has(x.reading_id) && x.user_id !== me.id).forEach(x => out.push({ id: `re-${x.reading_id}-${x.user_id}-${x.emoji}`, at: x.created_at || '', who: x.user_id, text: `reaccionó ${x.emoji} a tu tirada`, go: toReading(x.reading_id) }));
    snap.comments.filter(c => mine.has(c.reading_id) && c.user_id !== me.id).forEach(c => out.push({ id: `c-${c.id}`, at: c.created_at, who: c.user_id, text: `comentó: “${c.body.slice(0, 80)}${c.body.length > 80 ? '…' : ''}”`, go: toReading(c.reading_id) }));
    snap.friendships.filter(f => f.status === 'pending' && f.addressee === me.id).forEach(f => out.push({ id: `f-${f.id}`, at: new Date().toISOString(), who: f.requester, text: 'te envió una solicitud de amistad', go: () => ctx.go('amigos') }));
    return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30);
  }, [snap, me.id, ctx]);

  const unread = items.filter(n => n.id.startsWith('f-') || n.at > seen).length;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  function toggle() {
    const next = !open; setOpen(next);
    if (next) { const now = new Date().toISOString(); window.setTimeout(() => { setSeen(now); try { localStorage.setItem(key, now); } catch { /* ignore */ } }, 1500); }
  }

  return (
    <div className="bell" ref={ref}>
      <button type="button" className="icon-btn bell-btn" aria-haspopup="menu" aria-expanded={open} aria-label={unread ? `${unread} notificaciones nuevas` : 'Notificaciones'} onClick={toggle}>
        <Icon name="bell" />{unread > 0 && <span className="bell-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="menu bell-menu" role="menu">
          <p className="bell-title">Notificaciones</p>
          {items.length === 0 && <p className="fine bell-empty">Cuando tus amigos reaccionen o comenten tus tiradas, te aviso aquí.</p>}
          {items.map(n => {
            const p = byId.get(n.who);
            const isNew = n.id.startsWith('f-') || n.at > seen;
            return (
              <button key={n.id} type="button" role="menuitem" className={`notif${isNew ? ' new' : ''}`} onClick={() => { setOpen(false); n.go(); }}>
                <Avatar name={p?.display_name || '?'} accent={p?.accent || '#ccc'} kind={p?.avatar} size={36} />
                <span><b>{p?.display_name || 'Alguien'}</b> {n.text}<span className="fine">{n.at ? ago(n.at) : ''}</span></span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
