import { useCallback, useEffect, useMemo, useState } from 'react';
import { repo, auth, isLive, demoActAs, type Snapshot } from './lib/repo';
import type { Reading } from './lib/tarot';
import type { Profile } from './lib/types';
import { Icon, Avatar } from './components/ui';
import { Today } from './screens/Today';
import { Month } from './screens/Month';
import { History } from './screens/History';
import { Sky } from './screens/Sky';
import { Settings } from './screens/Settings';
import { ReadingSheet } from './screens/ReadingSheet';
import { Login, Onboarding, NewPassword } from './screens/Login';
import { Natal } from './screens/Natal';
import { Character } from './components/Character';

export type View = 'hoy' | 'mes' | 'historial' | 'cielo' | 'carta' | 'ajustes';
const VIEWS: View[] = ['hoy', 'mes', 'historial', 'cielo', 'carta', 'ajustes'];
const NAV: { v: View; label: string; icon: string }[] = [
  { v: 'hoy', label: 'Hoy', icon: 'today' }, { v: 'mes', label: 'Mes', icon: 'month' },
  { v: 'historial', label: 'Historial', icon: 'history' }, { v: 'cielo', label: 'Cielo', icon: 'sky' },
];
const SIDE_EXTRA: { v: View; label: string; icon: string }[] = [{ v: 'carta', label: 'Carta natal', icon: 'chart' }];

function parseHash(): { handle: string | null; view: View } {
  const [, h, v] = window.location.hash.replace(/^#/, '').split('/');
  return { handle: h || null, view: (VIEWS as string[]).includes(v) ? (v as View) : 'hoy' };
}

export interface Ctx {
  snap: Snapshot; viewed: Profile; readings: Reading[]; isMine: boolean;
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
      const s = await repo.load(); setSnap(s); setStatus('ready');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Error al cargar'); setStatus('error'); }
  }, []);

  useEffect(() => { refresh(); const off1 = auth.onChange((_s, ev) => { if (ev === 'PASSWORD_RECOVERY') setStatus('recovery'); else if (ev !== 'TOKEN_REFRESHED') refresh(); }); const off2 = repo.subscribe(() => refresh()); return () => { off1(); off2(); }; }, [refresh]);
  useEffect(() => { const f = () => setRoute(parseHash()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);

  const viewed = useMemo(() => {
    if (!snap?.me) return null;
    return snap.members.find(m => m.handle === route.handle) || snap.me;
  }, [snap, route.handle]);

  useEffect(() => {
    document.documentElement.dataset.who = viewed?.handle === 'diego' ? 'diego' : 'valentino';
    if (viewed) { document.documentElement.style.setProperty('--acc', viewed.accent); }
  }, [viewed]);

  const go = useCallback((view: View, handle?: string) => {
    const h = handle || viewed?.handle || '';
    window.location.hash = `/${h}${view === 'hoy' ? '' : '/' + view}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [viewed]);

  if (status === 'loading') return <div className="splash"><Character kind="nebula" size={140} className="breathe" /><p>Barajando…</p></div>;
  if (status === 'recovery') return <NewPassword onDone={() => { setStatus('loading'); refresh(); }} />;
  if (status === 'signedout') return <Login />;
  if (status === 'error' || !snap) return <div className="splash"><Character kind="moon" mood="sleepy" size={140} /><p>No pudimos cargar Taro.</p><p className="muted">{err}</p><button className="btn" onClick={refresh}>Reintentar</button></div>;
  if (!snap.me || !snap.me.circle_id) return <Onboarding snap={snap} onDone={refresh} />;
  if (!viewed) return null;

  const readings = snap.readings.filter(r => r.user_id === viewed.id).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const isMine = viewed.id === snap.me.id;
  const ctx: Ctx = { snap, viewed, readings, isMine, openSheet: r => setSheet({ open: true, reading: r || null }), go, refresh };
  const view = route.view;

  const switcher = (
    <div className="who" role="group" aria-label="Ver tiradas de">
      {snap.members.map(m => (
        <button key={m.id} type="button" aria-pressed={m.id === viewed.id} onClick={() => go(view, m.handle)} style={{ '--c': m.accent } as React.CSSProperties}>
          <Avatar name={m.display_name} accent={m.accent} size={28} /><span>{m.display_name}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo"><span className="logo-orb" aria-hidden="true" />Taro</div>
        {switcher}
        <nav aria-label="Secciones">
          {[...NAV, ...SIDE_EXTRA].map(n => <button key={n.v} type="button" className="side-link" aria-current={view === n.v ? 'page' : undefined} onClick={() => go(n.v)}><Icon name={n.icon} />{n.label}</button>)}
        </nav>
        {isMine && <button type="button" className="btn btn-primary side-new" onClick={() => ctx.openSheet()}><Icon name="plus" />Nueva tirada</button>}
        <div className="side-foot">
          <button type="button" className="side-link" aria-current={view === 'ajustes' ? 'page' : undefined} onClick={() => go('ajustes', snap.me!.handle)}><Icon name="user" />Ajustes</button>
          {repo.mode === 'demo' && <p className="demo-pill">Modo demo</p>}
        </div>
      </aside>

      <header className="topbar">
        <div className="logo"><span className="logo-orb" aria-hidden="true" />Taro</div>
        {switcher}
        <button type="button" className="icon-btn" aria-label="Ajustes" onClick={() => go('ajustes', snap.me!.handle)}><Icon name="user" /></button>
      </header>

      <main className="main" id="main">
        {repo.mode === 'demo' && <DemoBar snap={snap} />}
        {view === 'hoy' && <Today ctx={ctx} />}
        {view === 'mes' && <Month ctx={ctx} />}
        {view === 'historial' && <History ctx={ctx} />}
        {view === 'cielo' && <Sky ctx={ctx} />}
        {view === 'carta' && <Natal ctx={ctx} />}
        {view === 'ajustes' && <Settings ctx={ctx} />}
      </main>

      <nav className="bottomnav" aria-label="Secciones">
        {NAV.slice(0, 2).map(n => <NavBtn key={n.v} n={n} active={view === n.v} onClick={() => go(n.v)} />)}
        <button type="button" className="fab" aria-label="Nueva tirada" disabled={!isMine} onClick={() => ctx.openSheet()}><Icon name="plus" size={26} /></button>
        {NAV.slice(2).map(n => <NavBtn key={n.v} n={n} active={view === n.v || (n.v === 'cielo' && view === 'carta')} onClick={() => go(n.v)} />)}
      </nav>

      {sheet.open && <ReadingSheet ctx={ctx} reading={sheet.reading} onClose={() => setSheet({ open: false, reading: null })} />}
    </div>
  );
}

function NavBtn({ n, active, onClick }: { n: { label: string; icon: string }; active: boolean; onClick: () => void }) {
  return <button type="button" className="nav-btn" aria-current={active ? 'page' : undefined} onClick={onClick}><Icon name={n.icon} /><span>{n.label}</span></button>;
}

function DemoBar({ snap }: { snap: Snapshot }) {
  return (
    <div className="demobar" role="note">
      <span>Modo demo: los datos viven solo en este navegador. Conecta Supabase para compartir con Diego.</span>
      <label>Actuar como <select value={snap.me?.id} onChange={e => demoActAs(e.target.value)}>{snap.members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}</select></label>
    </div>
  );
}
