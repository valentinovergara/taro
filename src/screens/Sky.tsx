import { useMemo, useState } from 'react';
import type { Ctx } from '../App';
import { CARDS, posOf, validCards } from '../lib/tarot';
import { natalAdvice, PLANET_GLYPH, PLANETS, resonance, SIGN_GLYPH, SIGNS, sky, transitFor } from '../lib/astro';
import type { Placement } from '../lib/types';
import { Character } from '../components/Character';
import { TarotCard, Icon } from '../components/ui';
import { repo } from '../lib/repo';
import { todayIso } from './Today';

const pd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

export function Sky({ ctx }: { ctx: Ctx }) {
  const N: Placement[] = ctx.viewed.natal || [];
  const [sel, setSel] = useState<string>('');
  const r = ctx.readings.find(x => x.id === sel) || ctx.readings[0] || null;
  const date = r?.date || todayIso();
  const s = useMemo(() => sky(date, N), [date, N]);
  const adv = useMemo(() => natalAdvice(N), [N]);
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

      <section className="natal-sec">
        <div className="section-head"><h2 className="h2">Carta natal</h2></div>
        {N.length > 0 && <div className="natal-chips">{N.map(n => <span key={n[0]} className="chip chip-soft"><b>{PLANET_GLYPH[n[0]]}</b> {n[0]} en {n[1]}{n[2] && n[0] !== 'Ascendente' ? ` · C${n[2]}` : ''}</span>)}</div>}
        {adv.length > 0 && <div className="natal-adv">{adv.map(a => <article key={a.area} className="panel"><h3>{a.area}</h3><p className="fine">{a.basis}</p><p>{a.text}</p><p className="tip">{a.tip}</p></article>)}</div>}
        {ctx.isMine && <NatalEditor ctx={ctx} />}
      </section>
    </div>
  );
}

function NatalEditor({ ctx }: { ctx: Ctx }) {
  const init = Object.fromEntries(PLANETS.map(p => { const n = (ctx.viewed.natal || []).find(x => x[0] === p); return [p, { s: n?.[1] || '', h: n?.[2] ? String(n[2]) : '' }]; }));
  const [v, setV] = useState<Record<string, { s: string; h: string }>>(init);
  const [msg, setMsg] = useState('');
  const save = async () => {
    const natal: Placement[] = PLANETS.filter(p => v[p].s).map(p => [p, v[p].s, v[p].h ? Math.min(12, Math.max(1, +v[p].h)) : '']);
    try { await repo.saveProfile({ natal }); setMsg('Carta guardada.'); await ctx.refresh(); } catch { setMsg('No se pudo guardar.'); }
  };
  return (
    <details className="natal-edit" open={!(ctx.viewed.natal || []).length}>
      <summary><Icon name="edit" size={18} />{(ctx.viewed.natal || []).length ? 'Editar mi carta natal' : 'Agrega tu carta natal'}</summary>
      <p className="fine">Copia los signos y casas de tu app de astrología (por ejemplo, Co-Star).</p>
      <div className="natal-form">
        {PLANETS.map(p => (
          <div key={p} className="natal-row">
            <span>{p}</span>
            <select aria-label={`Signo de ${p}`} value={v[p].s} onChange={e => setV({ ...v, [p]: { ...v[p], s: e.target.value } })}><option value="">—</option>{SIGNS.map(s => <option key={s}>{s}</option>)}</select>
            <input aria-label={`Casa de ${p}`} inputMode="numeric" placeholder="Casa" value={v[p].h} onChange={e => setV({ ...v, [p]: { ...v[p], h: e.target.value.replace(/\D/g, '').slice(0, 2) } })} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" onClick={save}>Guardar carta</button> <span className="fine" aria-live="polite">{msg}</span>
    </details>
  );
}
