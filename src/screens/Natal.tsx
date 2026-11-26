import { useMemo, useState } from 'react';
import type { Ctx } from '../App';
import { chartFrom, chartToPlacements, computeChart, type Birth, type Chart, type ChartBody } from '../lib/natal';
import { ELEM, natalAdvice, PLANET_GLYPH, PLANETS, PMEAN, SIGN_GLYPH, SIGNS, TRAIT } from '../lib/astro';
import type { Placement } from '../lib/types';
import { Character } from '../components/Character';
import { BirthForm } from '../components/BirthForm';
import { Icon } from '../components/ui';
import { repo } from '../lib/repo';

const ELEM_COLOR: Record<string, string> = { Fuego: 'var(--bastos)', Tierra: 'var(--pentaculos)', Aire: 'var(--espadas)', Agua: 'var(--copas)' };
const norm = (x: number) => ((x % 360) + 360) % 360;
const fmtDeg = (d: number) => `${Math.floor(d)}°${String(Math.floor((d % 1) * 60)).padStart(2, '0')}′`;

export function Natal({ ctx }: { ctx: Ctx }) {
  const v = ctx.viewed, birth = ctx.meta.birth || null;
  const chart = useMemo(() => chartFrom(v.natal, birth), [v.natal, birth]);
  const N: Placement[] = v.natal || [];
  const adv = useMemo(() => natalAdvice(N), [N]);
  const get = (n: string) => chart?.bodies.find(b => b.name === n);
  const big3 = (['Sol', 'Luna', 'Ascendente'] as const).map(get).filter(Boolean) as ChartBody[];

  return (
    <div className="screen natal">
      <header className="natal-head">
        <div>
          <p className="eyebrow">Carta natal de {v.display_name}</p>
          <h1 className="h-display">{big3.length ? big3.map(b => `${b.name === 'Ascendente' ? '↑' : PLANET_GLYPH[b.name]} ${b.sign}`).join('  ') : 'Tu cielo al nacer'}</h1>
          {birth ? <p className="sub">{new Date(birth.date + 'T12:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}{birth.time ? ` · ${birth.time}` : ' · hora desconocida'} · {birth.place}</p>
            : <p className="sub">{chart ? 'Signos registrados a mano, sin datos de nacimiento.' : 'Todavía no hay carta natal.'}</p>}
        </div>
      </header>

      {!chart ? (
        <section className="natal-empty panel">
          <Character kind="sun" size={150} className="float" />
          <div>
            <h2 className="h2">{ctx.isMine ? 'Calculemos tu carta' : `${v.display_name} aún no ha registrado su carta`}</h2>
            {ctx.isMine && <><p className="muted">Con tu fecha, hora y lugar de nacimiento calculo tus planetas, tu Ascendente y tus casas.</p><BirthEditor ctx={ctx} birth={null} open /></>}
          </div>
        </section>
      ) : (
        <>
          <div className="natal-grid">
            <section className="panel wheel-panel"><Wheel chart={chart} /></section>
            <section className="panel"><CoStarTable chart={chart} /></section>
          </div>
          {adv.length > 0 && <section className="natal-adv">{adv.map(a => <article key={a.area} className="panel"><h3>{a.area}</h3><p className="fine">{a.basis}</p><p>{a.text}</p><p className="tip">{a.tip}</p></article>)}</section>}
          {ctx.isMine && <BirthEditor ctx={ctx} birth={birth} />}
          {ctx.isMine && !birth && <ManualEditor ctx={ctx} />}
        </>
      )}
    </div>
  );
}

/** Tabla al estilo Co-Star: signos · planetas · casas, en el orden de la rueda desde el Ascendente. */
function CoStarTable({ chart }: { chart: Chart }) {
  const start = chart.asc ?? 0;
  const rows = [...chart.bodies].sort((a, b) => norm(a.lon - start) - norm(b.lon - start) || (a.name === 'Ascendente' ? -1 : 1));
  const groups = (key: (b: ChartBody) => string | number | null) => {
    const out: { k: string | number | null; from: number; n: number }[] = [];
    rows.forEach((b, i) => { const k = key(b); const last = out[out.length - 1]; if (last && last.k === k) last.n++; else out.push({ k, from: i, n: 1 }); });
    return out;
  };
  const signs = groups(b => b.sign), hs = groups(b => b.house);
  return (
    <div className="costar" role="table" aria-label="Signos, planetas y casas">
      <div className="cs-head" role="row"><span role="columnheader">Signo</span><span role="columnheader">Planeta</span><span role="columnheader">Casa</span></div>
      <div className="cs-body">
        {signs.map(g => <div key={'s' + g.from} className="cs-sign" style={{ gridRow: `${g.from + 1} / span ${g.n}`, '--el': ELEM_COLOR[ELEM[g.k as string]] } as React.CSSProperties}><span className="cs-glyph" aria-hidden="true">{SIGN_GLYPH[SIGNS.indexOf(g.k as string)]}</span>{g.k}</div>)}
        {rows.map((b, i) => (
          <div key={b.name} className="cs-planet" style={{ gridRow: i + 1 }} role="row">
            <span className="cs-pg" aria-hidden="true">{b.name === 'Ascendente' ? '↑' : PLANET_GLYPH[b.name]}</span>
            <span className="cs-pn">{b.name}{b.rx && <em className="rx" title="Retrógrado"> ℞</em>}</span>
            {chart.cusps && <span className="cs-deg">{fmtDeg(b.deg)}</span>}
          </div>
        ))}
        {hs.map(g => <div key={'h' + g.from} className="cs-house" style={{ gridRow: `${g.from + 1} / span ${g.n}` }}>{g.k ?? '—'}</div>)}
      </div>
    </div>
  );
}

/** Rueda natal en SVG: signos, cúspides de casas y planetas; el Ascendente a la izquierda. */
function Wheel({ chart }: { chart: Chart }) {
  const S = 360, c = S / 2, R = 172, r1 = 144, r2 = 108, rp = 126;
  const asc = chart.asc ?? 0;
  const pt = (lon: number, r: number) => { const t = (180 + (lon - asc)) * Math.PI / 180; return [c + r * Math.cos(t), c - r * Math.sin(t)]; };
  const arc = (a0: number, a1: number, ro: number, ri: number) => {
    const [x0, y0] = pt(a0, ro), [x1, y1] = pt(a1, ro), [x2, y2] = pt(a1, ri), [x3, y3] = pt(a0, ri);
    return `M${x0} ${y0} A${ro} ${ro} 0 0 0 ${x1} ${y1} L${x2} ${y2} A${ri} ${ri} 0 0 1 ${x3} ${y3}Z`;
  };
  const planets = chart.bodies.filter(b => b.name !== 'Ascendente').sort((a, b) => a.lon - b.lon);
  const [tip, setTip] = useState<{ k: string; x: number; y: number; title: string; text: string } | null>(null);
  const show = (k: string, x: number, y: number, title: string, text: string) => ({
    onMouseEnter: () => setTip({ k, x, y, title, text }), onFocus: () => setTip({ k, x, y, title, text }),
    onMouseLeave: () => setTip(t => (t?.k === k ? null : t)), onBlur: () => setTip(t => (t?.k === k ? null : t)),
    onClick: () => setTip(t => (t?.k === k ? null : { k, x, y, title, text })), tabIndex: 0, role: 'button' as const, 'aria-label': `${title}. ${text}`,
  });
  const placed: { b: ChartBody; at: number }[] = [];
  planets.forEach(b => { let at = b.lon; const prev = placed[placed.length - 1]; if (prev && norm(at - prev.at) < 11) at = prev.at + 11; placed.push({ b, at }); });
  return (
    <div className="wheel-wrap">
    <svg viewBox={`0 0 ${S} ${S}`} className="wheel" role="img" aria-label={`Rueda natal: ${chart.bodies.map(b => `${b.name} en ${b.sign}`).join(', ')}`}>
      <defs><radialGradient id="wheelbg"><stop offset="0" stopColor="var(--surface)" /><stop offset="1" stopColor="var(--surface-2)" /></radialGradient></defs>
      <circle cx={c} cy={c} r={R} fill="url(#wheelbg)" stroke="var(--line-strong)" />
      {SIGNS.map((s, i) => {
        const [gx, gy] = pt(i * 30 + 15, (R + r1) / 2);
        return <g key={s} className={`w-signg${tip?.k === s ? ' on' : ''}`} {...show(s, gx, gy, `${SIGN_GLYPH[i]} ${s} · ${ELEM[s]}`, `Energía de ${TRAIT[s]}.`)}><path d={arc(i * 30, i * 30 + 30, R, r1)} fill={ELEM_COLOR[ELEM[s]]} stroke="var(--surface)" strokeWidth="1.5" /><text x={gx} y={gy} textAnchor="middle" dominantBaseline="central" className="w-sign">{SIGN_GLYPH[i]}</text></g>;
      })}
      <circle cx={c} cy={c} r={r1} fill="none" stroke="var(--line-strong)" />
      <circle cx={c} cy={c} r={r2} fill="none" stroke="var(--line)" />
      {chart.cusps?.map((l, i) => {
        const [x0, y0] = pt(l, 34), [x1, y1] = pt(l, r1), next = chart.cusps![(i + 1) % 12], mid = l + norm(next - l) / 2, [hx, hy] = pt(mid, r2 - 14);
        const angle = i === 0 || i === 3 || i === 6 || i === 9;
        return <g key={i}><line x1={x0} y1={y0} x2={x1} y2={y1} stroke={angle ? 'var(--ink-2)' : 'var(--line-strong)'} strokeWidth={angle ? 1.6 : 1} /><text x={hx} y={hy} textAnchor="middle" dominantBaseline="central" className="w-house">{i + 1}</text></g>;
      })}
      {placed.map(({ b, at }) => {
        const [x, y] = pt(at, rp), [tx, ty] = pt(b.lon, r2), [sx, sy] = pt(b.lon, r2 + 5);
        return <g key={b.name} className={`w-planet${tip?.k === b.name ? ' on' : ''}`} style={{ '--pc': ELEM_COLOR[ELEM[b.sign]] } as React.CSSProperties} {...show(b.name, x, y, `${PLANET_GLYPH[b.name]} ${b.name} en ${b.sign} ${fmtDeg(b.deg)}${b.house ? ` · casa ${b.house}` : ''}`, `${PMEAN[b.name].charAt(0).toUpperCase() + PMEAN[b.name].slice(1)}, con ${TRAIT[b.sign]}.`)}><line x1={tx} y1={ty} x2={sx} y2={sy} stroke="var(--acc-ink)" strokeWidth="2" /><circle className="w-dot" cx={x} cy={y} r="12" /><text x={x} y={y} textAnchor="middle" dominantBaseline="central">{PLANET_GLYPH[b.name]}</text></g>;
      })}
      <circle cx={c} cy={c} r="34" fill="var(--acc-soft)" /><text x={c} y={c} textAnchor="middle" dominantBaseline="central" className="w-center">{chart.asc != null ? 'AC ←' : ''}</text>
    </svg>
    {tip ? <div className="wheel-tip" role="status" style={{ left: `${(tip.x / S) * 100}%`, top: `${(tip.y / S) * 100}%` }}><b>{tip.title}</b><span>{tip.text}</span></div>
      : <p className="fine wheel-hint">Pasa el cursor o toca un planeta o un signo para leerlo.</p>}
    </div>
  );
}

function BirthEditor({ ctx, birth, open = false }: { ctx: Ctx; birth: Birth | null; open?: boolean }) {
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('');
  const save = async (b: Birth) => {
    setBusy(true); setMsg('');
    try { await repo.saveProfile({ natal: chartToPlacements(computeChart(b)) }); await repo.saveMyMeta({ ...ctx.snap.myMeta, birth: b, birth_skipped: false }); await ctx.refresh(); setMsg('Carta calculada.'); }
    catch { setMsg('No se pudo guardar.'); }
    setBusy(false);
  };
  const form = <BirthForm initial={birth} busy={busy} onSave={save} saveLabel={birth ? 'Recalcular mi carta' : 'Calcular mi carta'} />;
  if (open) return <>{form}<p className="fine" aria-live="polite">{msg}</p></>;
  return (
    <details className="natal-edit">
      <summary><Icon name="edit" size={18} />{birth ? 'Editar datos de nacimiento' : 'Calcular con mi fecha, hora y lugar'}</summary>
      {form}<p className="fine" aria-live="polite">{msg}</p>
    </details>
  );
}

function ManualEditor({ ctx }: { ctx: Ctx }) {
  const init = Object.fromEntries(PLANETS.map(p => { const n = (ctx.viewed.natal || []).find(x => x[0] === p); return [p, { s: n?.[1] || '', h: n?.[2] ? String(n[2]) : '' }]; }));
  const [v, setV] = useState<Record<string, { s: string; h: string }>>(init);
  const [msg, setMsg] = useState('');
  const save = async () => {
    const natal: Placement[] = PLANETS.filter(p => v[p].s).map(p => [p, v[p].s, v[p].h ? Math.min(12, Math.max(1, +v[p].h)) : '']);
    try { await repo.saveProfile({ natal }); setMsg('Guardado.'); await ctx.refresh(); } catch { setMsg('No se pudo guardar.'); }
  };
  return (
    <details className="natal-edit">
      <summary><Icon name="edit" size={18} />Ajustar signos a mano</summary>
      <div className="natal-form">
        {PLANETS.map(p => (
          <div key={p} className="natal-row">
            <span>{p}</span>
            <select aria-label={`Signo de ${p}`} value={v[p].s} onChange={e => setV({ ...v, [p]: { ...v[p], s: e.target.value } })}><option value="">—</option>{SIGNS.map(s => <option key={s}>{s}</option>)}</select>
            <input aria-label={`Casa de ${p}`} inputMode="numeric" placeholder="Casa" value={v[p].h} onChange={e => setV({ ...v, [p]: { ...v[p], h: e.target.value.replace(/\D/g, '').slice(0, 2) } })} />
          </div>
        ))}
      </div>
      <button className="btn" onClick={save}>Guardar</button> <span className="fine" aria-live="polite">{msg}</span>
    </details>
  );
}
