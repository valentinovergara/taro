import { useEffect, useLayoutEffect, useState } from 'react';
import type { Ctx } from '../App';
import { repo } from '../lib/repo';
import { Character } from './Character';

const STEPS = [
  { sel: '[data-tour="new"]', title: 'Aquí haces tu primera tirada', text: 'Taro baraja por ti, o registras las cartas de tu propio mazo. Tres cartas: amor, trabajo y lo personal.' },
  { sel: '#recs-title', title: 'Tu recomendación del día', text: 'Una canción, un libro y una película según la energía de tus cartas.' },
  { sel: '#feed-title', title: 'Las tiradas de tus amigos', text: 'Reacciona con emojis y comenta. Tú decides qué tiradas compartes y cuáles son solo para ti.' },
  { sel: '[data-tour="menu"]', title: 'Tu perfil', text: 'Aquí encuentras a tus amigos, tu carta natal, tu personaje y tus ajustes.' },
];

/** Recorrido guiado la primera vez que entras. */
export function Tour({ ctx }: { ctx: Ctx }) {
  const [i, setI] = useState(() => { try { return localStorage.getItem(`taro-tour-${ctx.snap.me!.id}`) ? -1 : 0; } catch { return 0; } });
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = STEPS[i];

  useLayoutEffect(() => {
    if (!step) return;
    const el = [...document.querySelectorAll<HTMLElement>(step.sel)].find(e => e.offsetParent !== null);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const t = window.setTimeout(() => setRect(el.getBoundingClientRect()), 350);
    return () => window.clearTimeout(t);
  }, [i, step]);
  useEffect(() => { const f = () => setRect(null); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);

  async function done() {
    setI(-1);
    try { localStorage.setItem(`taro-tour-${ctx.snap.me!.id}`, '1'); } catch { /* ignore */ }
    try { await repo.saveMyMeta({ ...ctx.snap.myMeta, tour_done: true }); } catch { /* no bloquea */ }
  }
  if (!step) return null;
  const pad = 8;
  const below = rect ? rect.bottom + 200 < window.innerHeight : true;
  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect && <div className="tour-spot" style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />}
      <div className="tour-card" style={rect ? { top: below ? rect.bottom + 16 : undefined, bottom: below ? undefined : window.innerHeight - rect.top + 16, left: Math.min(Math.max(rect.left + rect.width / 2, 200), window.innerWidth - 200) } : { top: '30%' }}>
        <Character kind={i === 0 ? 'star' : i === 1 ? 'sun' : i === 2 ? 'moon' : 'planet'} size={56} aura={false} />
        <div>
          <p className="fine">{i + 1} de {STEPS.length}</p>
          <h3 id="tour-title">{step.title}</h3>
          <p>{step.text}</p>
          <div className="tour-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={done}>Saltar</button>
            {i < STEPS.length - 1
              ? <button type="button" className="btn btn-primary btn-sm" onClick={() => setI(i + 1)}>Siguiente</button>
              : <button type="button" className="btn btn-primary btn-sm" onClick={() => { done(); ctx.openSheet(); }}>Hacer mi primera tirada</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
