import { useMemo, useState } from 'react';
import type { Ctx } from '../App';
import { CARDS, posOf, validCards } from '../lib/tarot';
import { PLANET_GLYPH, SIGN_GLYPH, isSlow, moonEvents, resonance, signSince, sky, skySummary, transitFor, transitPlain } from '../lib/astro';
import type { Placement } from '../lib/types';
import { Character } from '../components/Character';
import { TarotCard, Icon } from '../components/ui';
import { todayIso } from './Today';

const pd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Cielo: qué está pasando arriba, en palabras sencillas, y cómo conversa con tus tiradas. */
export function Sky({ ctx }: { ctx: Ctx }) {
  const N: Placement[] = ctx.viewed.natal || [];
  const [date, setDate] = useState(todayIso());
  const d0 = pd(date);
  const [cur, setCur] = useState({ y: d0.getFullYear(), m: d0.getMonth() });
  const s = useMemo(() => sky(date, N), [date, N]);
  const summary = useMemo(() => skySummary(date, s, N, ctx.viewed.display_name), [date, s, N, ctx.viewed.display_name]);
  const moons = useMemo(() => moonEvents(cur.y, cur.m), [cur]);
  const prefix = iso(cur.y, cur.m, 1).slice(0, 7);
  const monthRs = ctx.readings.filter(r => r.date.startsWith(prefix)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const dayRs = ctx.readings.filter(r => r.date === date);
  const step = (k: number) => setCur(c => { const m = c.m + k; return { y: c.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 }; });
  const off = (new Date(cur.y, cur.m, 1).getDay() + 6) % 7, dim = new Date(cur.y, cur.m + 1, 0).getDate();
  const isToday = date === todayIso();
  const fast = s?.filter(p => !isSlow(p.n)) || [], slow = s?.filter(p => isSlow(p.n)) || [];

  const row = (p: NonNullable<typeof s>[number]) => {
    const top = p.asp.filter(a => a.name !== 'sextil').sort((a, b) => b.score - a.score)[0];
    const since = isSlow(p.n) ? signSince(p.n, date) : null;
    return (
      <li key={p.n}>
        <span className="glyph" aria-hidden="true">{PLANET_GLYPH[p.n]}</span>
        <span className="t-main">
          <span className="t-line"><b>{p.n}</b> en {SIGN_GLYPH[p.si]} {p.sign}{p.rx && <em className="rx" title="Retrógrado"> ℞</em>}{since && <span className="chip since">desde {since}</span>}</span>
          <span className="t-desc">{transitPlain(p)}</span>
          {top && <span className="t-asp">Para ti: {top.name} a tu {top.np} en {top.ns}.</span>}
        </span>
      </li>
    );
  };

  return (
    <div className="screen sky">
      <section className="sky-hero">
        <div>
          <p className="eyebrow">{ctx.isMine ? 'Tu cielo' : `El cielo de ${ctx.viewed.display_name}`}</p>
          <h1 className="h-display">{isToday ? 'Cómo está el cielo hoy' : `El cielo del ${d0.getDate()} de ${d0.toLocaleDateString('es-CO', { month: 'long' })}`}</h1>
        </div>
        <Character kind="planet" size={180} className="float" />
      </section>

      {summary.length > 0 && (
        <section className="sky-summary">
          <p className="advice-lead">{summary[0]}</p>
          {summary.slice(1).map((t, i) => <p key={i}>{t}</p>)}
          {!N.length && ctx.isMine && <button type="button" className="link" onClick={() => ctx.go('carta')}>Agrega tu carta natal para que esto te hable a ti</button>}
        </section>
      )}

      <div className="sky-grid">
        <section className="panel">
          <div className="section-head">
            <h3 className="cap">{new Date(cur.y, cur.m, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</h3>
            <div className="pager">
              <button className="icon-btn icon-btn-sm" onClick={() => step(-1)} aria-label="Mes anterior"><Icon name="left" size={18} /></button>
              <button className="icon-btn icon-btn-sm" onClick={() => step(1)} aria-label="Mes siguiente"><Icon name="right" size={18} /></button>
            </div>
          </div>
          <div className="cal cal-mini" role="grid" aria-label="Elige un día">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x, i) => <span key={i} className="cal-dow">{x}</span>)}
            {Array.from({ length: off }, (_, i) => <span key={'o' + i} />)}
            {Array.from({ length: dim }, (_, i) => {
              const ds = iso(cur.y, cur.m, i + 1), has = ctx.readings.some(r => r.date === ds), ev = moons.get(ds);
              return (
                <button key={ds} type="button" className={`cal-day${has ? ' has' : ''}${ds === todayIso() ? ' today' : ''}${ds === date ? ' sel' : ''}`} aria-pressed={ds === date} onClick={() => setDate(ds)} aria-label={`${i + 1}${ev ? `, ${ev.map(e => e.label).join(', ')}` : ''}${has ? ', con tirada' : ''}`}>
                  <span className="cal-n">{i + 1}</span>
                  {ev ? <span className="cal-moon" aria-hidden="true">{ev[ev.length - 1].icon}</span> : has ? <span className="cal-dot" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
          <p className="fine">Los días con punto tienen tirada. 🌑 🌓 🌕 🌗 son las fases de la Luna.</p>

          <h3 className="detail-h">{dayRs.length ? 'Tu tirada y el cielo de ese día' : 'Tiradas de este mes'}</h3>
          {dayRs.length > 0 && dayRs.map(r => validCards(r).map((x, i) => {
            const c = CARDS[x.c], area = posOf(r, i), tr = transitFor(area, s, N);
            return (
              <div className="cross" key={r.id + i}>
                <TarotCard card={x} size="sm" />
                <div>
                  <p className="cross-title" style={{ '--suit': `var(--${c.suit})` } as React.CSSProperties}>{area} · {c.name}</p>
                  <p>{resonance(c, N)}</p>
                  {tr && <p className="muted">{tr}</p>}
                </div>
              </div>
            );
          }))}
          {!dayRs.length && (monthRs.length ? (
            <ul className="sky-readings">
              {monthRs.map(r => (
                <li key={r.id}><button type="button" onClick={() => setDate(r.date)}>
                  <span className="sr-date">{pd(r.date).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })}</span>
                  <span className="sr-cards">{validCards(r).map((x, k) => <TarotCard key={k} card={x} size="xs" />)}</span>
                  <span className="sr-names">{validCards(r).map(x => CARDS[x.c].name).join(' · ')}</span>
                  <Icon name="right" size={18} />
                </button></li>
              ))}
            </ul>
          ) : <p className="muted">Este mes no hay tiradas. Elige cualquier día para ver cómo estaba el cielo.</p>)}
        </section>

        <section className="panel">
          <div className="section-head"><h3>Los planetas, uno por uno</h3></div>
          {!s ? <p className="muted">No pude calcular el cielo.</p> : (
            <>
              <ul className="transits">{fast.map(row)}</ul>
              <div className="slow-note">
                <p className="eyebrow">Los planetas lentos</p>
                <p className="fine">Tardan años en cambiar de signo, así que marcan el clima de toda una época más que tu día a día.</p>
              </div>
              <ul className="transits">{slow.map(row)}</ul>
            </>
          )}
          <p className="fine">℞ = retrógrado: el planeta parece ir hacia atrás y su tema pide revisión.</p>
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
