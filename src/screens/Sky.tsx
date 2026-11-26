import { useMemo, useState } from 'react';
import type { Ctx } from '../App';
import { CARDS, posOf, validCards } from '../lib/tarot';
import { PLANET_GLYPH, resonance, SIGN_GLYPH, sky, transitFor } from '../lib/astro';
import type { Placement } from '../lib/types';
import { Character } from '../components/Character';
import { TarotCard, Icon } from '../components/ui';
import { todayIso } from './Today';

const pd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

export function Sky({ ctx }: { ctx: Ctx }) {
  const N: Placement[] = ctx.viewed.natal || [];
  const [sel, setSel] = useState<string>('');
  const r = ctx.readings.find(x => x.id === sel) || ctx.readings[0] || null;
  const date = r?.date || todayIso();
  const s = useMemo(() => sky(date, N), [date, N]);
  const big3 = ['Sol', 'Luna', 'Ascendente'].map(p => N.find(n => n[0] === p)).filter(Boolean) as Placement[];

  return (
    <div className="screen sky">
      <section className="sky-hero">
        <div>
          <p className="eyebrow">Cielo de {ctx.viewed.display_name}</p>
          <h1 className="h-display">Tiradas y tránsitos</h1>
          <p className="sub">{big3.length ? big3.map(p => `${p[0] === 'Ascendente' ? 'Asc.' : p[0]} ${p[1]}`).join(' · ') : 'Sin carta natal todavía.'}</p>
        </div>
        <Character kind="planet" size={180} className="float" />
      </section>

      {ctx.readings.length > 0 && (
        <label className="field inline-field">Comparar la tirada del
          <select value={r?.id || ''} onChange={e => setSel(e.target.value)}>
            {ctx.readings.map(x => <option key={x.id} value={x.id}>{pd(x.date).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</option>)}
          </select>
        </label>
      )}

      <div className="sky-grid">
        <section className="panel">
          <div className="section-head"><h3>Lectura cruzada</h3></div>
          {!r && <p className="muted">Aún no hay tiradas para comparar.</p>}
          {r && validCards(r).map((x, i) => {
            const c = CARDS[x.c], area = posOf(r, i), tr = transitFor(area, s, N);
            return (
              <div className="cross" key={i}>
                <TarotCard card={x} size="sm" />
                <div>
                  <p className="cross-title" style={{ '--suit': `var(--${c.suit})` } as React.CSSProperties}>{area} · {c.name}</p>
                  <p>{resonance(c, N)}</p>
                  {tr && <p className="muted">{tr}</p>}
                </div>
              </div>
            );
          })}
        </section>

        <section className="panel">
          <div className="section-head"><h3>El cielo ese día</h3></div>
          {!s ? <p className="muted">No se pudo calcular el cielo.</p> : (
            <ul className="transits">
              {s.map(p => {
                const top = p.asp.filter(a => a.name !== 'sextil').sort((a, b) => b.score - a.score)[0];
                return (
                  <li key={p.n}>
                    <span className="glyph" aria-hidden="true">{PLANET_GLYPH[p.n]}</span>
                    <span className="t-name">{p.n}</span>
                    <span className="t-sign">{SIGN_GLYPH[p.si]} {p.sign} {p.deg}°{p.rx && <em className="rx" title="Retrógrado"> ℞</em>}</span>
                    <span className="t-asp">{top ? `${top.name} a tu ${top.np}` : ''}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="fine">Aspectos por signo: la carta natal tiene signos, no grados. ℞ = retrógrado.</p>
        </section>
      </div>

      <button type="button" className="natal-link" onClick={() => ctx.go('carta')}>
        <Character kind="sun" size={72} aura={false} />
        <span><b>Carta natal</b><span className="muted">{N.length ? 'Tu rueda, tus casas y consejos según tu carta.' : 'Calcúlala con tu fecha, hora y lugar de nacimiento.'}</span></span>
        <Icon name="right" />
      </button>
    </div>
  );
}
