import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { repo, auth, isLive, demoActAs, type Snapshot } from './lib/repo';
import type { Reading } from './lib/tarot';
import type { Profile, ProfileMeta } from './lib/types';
import { Icon, Avatar } from './components/ui';
import { Today } from './screens/Today';
import { Month } from './screens/Month';
import { History } from './screens/History';
import { Sky } from './screens/Sky';
import { Settings } from './screens/Settings';
import { ReadingSheet } from './screens/ReadingSheet';
import { Login, Onboarding, NewPassword } from './screens/Login';
import { Natal } from './screens/Natal';
import { Friends } from './screens/Friends';
import { Character } from './components/Character';
import { Bell } from './components/Bell';
import { Tour } from './components/Tour';
import { BigThree } from './components/Feed';

export type View = 'hoy' | 'mes' | 'historial' | 'cielo' | 'carta' | 'ajustes' | 'amigos';
const VIEWS: View[] = ['hoy', 'mes', 'historial', 'cielo', 'carta', 'ajustes', 'amigos'];
const NAV: { v: View; label: string; icon: string }[] = [
  { v: 'hoy', label: 'Hoy', icon: 'today' }, { v: 'mes', label: 'Ciclos', icon: 'month' },
  { v: 'historial', label: 'Historial', icon: 'history' }, { v: 'cielo', label: 'Cielo', icon: 'sky' },
];
const SIDE_EXTRA: { v: View; label: string; icon: string }[] = [{ v: 'carta', label: 'Carta natal', icon: 'chart' }, { v: 'amigos', label: 'Amigos', icon: 'users' }];

/** Rutas: #/  ·  #/<usuario>  ·  #/<usuario>/<vista>  ·  #/agregar/<usuario> */
function parseHash(): { handle: string | null; view: View; add: string | null } {
  const [, h, v] = window.location.hash.replace(/^#/, '').split('/');
  if (h === 'agregar') return { handle: null, view: 'amigos', add: v || null };
  return { handle: h || null, view: (VIEWS as string[]).includes(v) ? (v as View) : 'hoy', add: null };
}

export interface Ctx {
  snap: Snapshot; viewed: Profile; readings: Reading[]; isMine: boolean;
  /** Datos privados del perfil que se está viendo (solo si es el mío). */
  meta: ProfileMeta;
  openSheet: (r?: Reading | null) => void; go: (view: View, handle?: string) => void; refresh: () => Promise<void>;
}

export default function App() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'signedout' | 'ready' | 'error' | 'recovery'>('loading');
  const [err, setErr] = useState('');
  const [route, setRoute] = useState(parseHash);
  const [sheet, setSheet] = useState<{ open: boolean; reading: Reading | null }>({ open: false, reading: null });

  const refresh = useCallback(async () => {
    try {
      if (isLive && !(await auth.session())) { setStatus('signedout'); return; }
      const s = await repo.load(); setSnap(s); setStatus(st => (st === 'recovery' ? st : 'ready'));
    } catch (e) { setErr(e instanceof Error ? e.message : 'Error al cargar'); setStatus('error'); }
  }, []);

  useEffect(() => { refresh(); const off1 = auth.onChange((_s, ev) => { if (ev === 'PASSWORD_RECOVERY') setStatus('recovery'); else if (ev !== 'TOKEN_REFRESHED') refresh(); }); const off2 = repo.subscribe(() => refresh()); return () => { off1(); off2(); }; }, [refresh]);
  useEffect(() => { const f = () => setRoute(parseHash()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);

  const viewed = useMemo(() => {
    if (!snap?.me) return null;
    return snap.members.find(m => m.handle === route.handle) || snap.me;
  }, [snap, route.handle]);

  useEffect(() => {
    document.documentElement.dataset.who = viewed?.accent?.toLowerCase() === '#69cda6' ? 'diego' : 'valentino';
    if (viewed) document.documentElement.style.setProperty('--acc', viewed.accent);
  }, [viewed]);

  const go = useCallback((view: View, handle?: string) => {
    const h = handle || snap?.me?.handle || '';
    window.location.hash = `/${h}${view === 'hoy' ? '' : '/' + view}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [snap]);

  if (status === 'loading') return <div className="splash"><Character kind="nebula" size={140} className="breathe" /><p>Barajando…</p></div>;
  if (status === 'recovery') return <NewPassword onDone={() => { setStatus('loading'); refresh(); }} />;
  if (status === 'signedout') return <Login />;
  if (status === 'error' || !snap) return <div className="splash"><Character kind="moon" mood="sleepy" size={140} /><p>No pudimos cargar Taro.</p><p className="muted">{err}</p><button className="btn" onClick={refresh}>Reintentar</button></div>;
  const me = snap.me;
  const needsBirth = !!me && !me.natal?.length && !snap.myMeta.birth && !snap.myMeta.birth_skipped;
  const isNew = !!me && !snap.myMeta.onboarded && snap.friendships.length === 0 && !snap.readings.some(r => r.user_id === me.id);
  if (!me || needsBirth || (isNew && !route.add)) return <Onboarding snap={snap} onDone={refresh} />;
  if (!viewed) return null;

  const readings = snap.readings.filter(r => r.user_id === viewed.id).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const isMine = viewed.id === me.id;
  const ctx: Ctx = { snap, viewed, readings, isMine, meta: isMine ? snap.myMeta : {}, openSheet: r => setSheet({ open: true, reading: r || null }), go, refresh };
  const view = route.view;
  const incoming = snap.friendships.filter(f => f.status === 'pending' && f.addressee === me.id).length;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="side-top"><div className="logo"><span className="logo-orb" aria-hidden="true" />Taro</div><Bell ctx={ctx} /></div>
        <nav aria-label="Secciones">
          {[...NAV, ...SIDE_EXTRA].map(n => (
            <button key={n.v} type="button" className="side-link" aria-current={isMine && view === n.v ? 'page' : undefined} onClick={() => go(n.v)}>
              <Icon name={n.icon} />{n.label}{n.v === 'amigos' && incoming > 0 && <span className="badge">{incoming}</span>}
            </button>
          ))}
        </nav>
        {<button type="button" className="btn btn-primary side-new" onClick={() => { if (!isMine) go('hoy'); ctx.openSheet(); }}><Icon name="plus" />Nueva tirada</button>}
        <div className="side-foot">
          <div data-tour="menu"><UserMenu ctx={ctx} incoming={incoming} placement="up" /></div>
          {repo.mode === 'demo' && <p className="demo-pill">Modo demo</p>}
        </div>
      </aside>

      <header className="topbar">
        <button type="button" className="logo logo-btn" onClick={() => go('hoy', me.handle)}><span className="logo-orb" aria-hidden="true" />Taro</button>
        {!isMine && <button type="button" className="viewing" onClick={() => go('hoy')} aria-label={`Estás viendo a ${viewed.display_name}. Volver a mi Taro`}><Avatar name={viewed.display_name} accent={viewed.accent} kind={viewed.avatar} size={24} />{viewed.display_name}<Icon name="close" size={14} /></button>}
        <Bell ctx={ctx} />
        <span data-tour="menu" className="tour-anchor"><UserMenu ctx={ctx} incoming={incoming} placement="down" /></span>
      </header>

      <main className="main" id="main">
        {repo.mode === 'demo' && <DemoBar snap={snap} />}
        {!isMine && view !== 'amigos' && (
          <section className="friend-head" style={{ '--who': viewed.accent } as React.CSSProperties} aria-label={`Perfil de ${viewed.display_name}`}>
            <button type="button" className="btn btn-ghost btn-sm friend-back" onClick={() => go('hoy')}><Icon name="left" size={18} />Volver a mi Taro</button>
            <div className="friend-id">
              <Avatar name={viewed.display_name} accent={viewed.accent} kind={viewed.avatar} size={72} />
              <div><p className="eyebrow">Perfil de amigo</p><h1 className="h-display">{viewed.display_name}</h1><p className="fine">@{viewed.handle}</p><BigThree p={viewed} /></div>
            </div>
            <div className="friend-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={view !== 'carta'} onClick={() => go('hoy', viewed.handle)}>Tiradas</button>
              <button type="button" role="tab" aria-selected={view === 'carta'} onClick={() => go('carta', viewed.handle)}>Carta natal</button>
            </div>
          </section>
        )}
        {view === 'hoy' && <Today ctx={ctx} />}
        {view === 'mes' && <Month ctx={ctx} />}
        {view === 'historial' && <History ctx={ctx} />}
        {view === 'cielo' && <Sky ctx={ctx} />}
        {view === 'carta' && <Natal ctx={ctx} />}
        {view === 'ajustes' && <Settings ctx={ctx} />}
        {view === 'amigos' && <Friends ctx={{ ...ctx, viewed: me, isMine: true, meta: snap.myMeta }} addHandle={route.add} />}
      </main>

      <nav className="bottomnav" aria-label="Secciones">
        {NAV.slice(0, 2).map(n => <NavBtn key={n.v} n={n} active={isMine && view === n.v} onClick={() => go(n.v)} />)}
        <button type="button" className="fab" aria-label="Nueva tirada" onClick={() => { if (!isMine) go('hoy'); ctx.openSheet(); }}><Icon name="plus" size={26} /></button>
        {NAV.slice(2).map(n => <NavBtn key={n.v} n={n} active={isMine && (view === n.v || (n.v === 'cielo' && view === 'carta'))} onClick={() => go(n.v)} />)}
      </nav>

      {view === 'hoy' && isMine && !snap.myMeta.tour_done && !sheet.open && <Tour ctx={ctx} />}
      {sheet.open && <ReadingSheet ctx={{ ...ctx, viewed: me, isMine: true, meta: snap.myMeta }} reading={sheet.reading} onClose={() => setSheet({ open: false, reading: null })} />}
    </div>
  );
}

function UserMenu({ ctx, incoming, placement }: { ctx: Ctx; incoming: number; placement: 'up' | 'down' }) {
  const me = ctx.snap.me!;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  const item = (label: string, icon: string, f: () => void, badge = 0) => (
    <button type="button" role="menuitem" className="menu-item" onClick={() => { setOpen(false); f(); }}><Icon name={icon} size={20} />{label}{badge > 0 && <span className="badge">{badge}</span>}</button>
  );
  return (
    <div className={`usermenu usermenu-${placement}`} ref={ref}>
      <button type="button" className="usermenu-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Avatar name={me.display_name} accent={me.accent} kind={me.avatar} size={34} />
        <span className="usermenu-name">{me.display_name}</span>
        {incoming > 0 && <span className="dot" aria-label={`${incoming} solicitudes de amistad`} />}
        <Icon name="down" size={16} />
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-head"><Avatar name={me.display_name} accent={me.accent} kind={me.avatar} size={40} /><span><b>{me.display_name}</b><span className="fine">@{me.handle}</span></span></div>
          {item('Mi Taro', 'today', () => ctx.go('hoy', me.handle))}
          {item('Amigos', 'users', () => ctx.go('amigos', me.handle), incoming)}
          {item('Carta natal', 'chart', () => ctx.go('carta', me.handle))}
          {item('Ajustes', 'user', () => ctx.go('ajustes', me.handle))}
          {repo.mode === 'live' && item('Cerrar sesión', 'out', () => auth.signOut())}
        </div>
      )}
    </div>
  );
}

function NavBtn({ n, active, onClick }: { n: { label: string; icon: string }; active: boolean; onClick: () => void }) {
  return <button type="button" className="nav-btn" aria-current={active ? 'page' : undefined} onClick={onClick}><Icon name={n.icon} /><span>{n.label}</span></button>;
}

function DemoBar({ snap }: { snap: Snapshot }) {
  return (
    <div className="demobar" role="note">
      <span>Modo demo: los datos viven solo en este navegador.</span>
      <label>Actuar como <select value={snap.me?.id} onChange={e => demoActAs(e.target.value)}>{snap.members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}</select></label>
    </div>
  );
}
