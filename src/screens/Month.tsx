import { useEffect, useMemo, useState } from 'react';
import type { Ctx } from '../App';
import { CARDS, SUIT_LABEL, SUIT_ORDER, validCards, posOf, type Suit, type Reading } from '../lib/tarot';
import { analyze, monthAdvice } from '../lib/analysis';
import { MOON_TIP, PLANET_GLYPH, SIGN_GLYPH, moonEvents, moonPhaseName, sky, skyLine, transitPlain } from '../lib/astro';
import { Character, SUIT_CHARACTER } from '../components/Character';
import { TarotCard, Icon, SuitIcon } from '../components/ui';
import { supabase, repo } from '../lib/repo';
import { todayIso } from './Today';

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const pd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

/** Ciclos: el mes con sus lunas, eclipses, palos y cartas que se repiten. */
export function Month({ ctx }: { ctx: Ctx }) {
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [day, setDay] = useState<string | null>(null);
  const prefix = iso(cur.y, cur.m, 1).slice(0, 7);
  const rs = useMemo(() => ctx.readings.filter(r => r.date.startsWith(prefix)).sort((a, b) => (a.date < b.date ? -1 : 1)), [ctx.readings, prefix]);
  const a = useMemo(() => analyze(rs), [rs]);
  const advice = useMemo(() => monthAdvice(rs, a, ctx.viewed, ctx.meta), [rs, a, ctx.viewed, ctx.meta]);
  const moons = useMemo(() => moonEvents(cur.y, cur.m), [cur]);
  const maxSuit = Math.max(1, ...SUIT_ORDER.map(s => a.suit[s]));
  const domSuit = (SUIT_ORDER.slice().sort((x, y) => a.suit[y] - a.suit[x])[0]) as Suit;
  const step = (d: number) => setCur(c => { const m = c.m + d; return { y: c.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 }; });
  const off = (new Date(cur.y, cur.m, 1).getDay() + 6) % 7, dim = new Date(cur.y, cur.m + 1, 0).getDate();
  const [deep, setDeep] = useState<{ busy: boolean; text: string }>({ busy: false, text: '' });
  const top = a.ranked.slice(0, 5), topMax = top[0]?.[1] || 1;
  const enough = rs.length >= 3;
  const who = ctx.isMine ? 'Tus' : `Los de ${ctx.viewed.display_name}:`;

  async function askDeep() {
    if (!supabase) return;
    setDeep({ busy: true, text: '' });
    const lines = rs.map(r => `${r.date} {cielo: ${skyLine(r.date)}} [${r.tags.join(', ') || 'sin tema'}]: ` + validCards(r).map((x, i) => `${posOf(r, i)}=${CARDS[x.c].name}${x.r ? ' (invertida)' : ''}`).join('; ') + (r.note ? ` — nota: ${r.note}` : '')).join('\n');
    const { data, error } = await supabase.functions.invoke('deep-reading', { body: { name: ctx.viewed.display_name, natal: ctx.viewed.natal, context: ctx.isMine ? ctx.snap.context : '', lines } });
    setDeep({ busy: false, text: error ? 'La lectura profunda todavía no está activada.' : String(data?.text || '') });
  }

  return (
    <div className="screen month">
      <header className="month-head">
        <div>
          <p className="eyebrow">{who} ciclos</p>
          <h1 className="h-display">{new Date(cur.y, cur.m, 1).toLocaleDateString('es-CO', { month: 'long' })} <span className="muted-year">{cur.y}</span></h1>
        </div>
        <div className="pager">
          <button className="icon-btn" onClick={() => step(-1)} aria-label="Mes anterior"><Icon name="left" /></button>
          <button className="icon-btn" onClick={() => step(1)} aria-label="Mes siguiente"><Icon name="right" /></button>
        </div>
      </header>

      <div className="stat-row">
        <div className="stat"><b>{rs.length}</b><span>tiradas</span><Icon name="sparkle" /></div>
        <div className="stat"><b>{a.total}</b><span>cartas</span><Icon name="month" /></div>
        <div className="stat"><b>{a.days}</b><span>días con lectura</span><Icon name="today" /></div>
      </div>

      <div className="month-grid">
        <section className="panel">
          <div className="section-head"><h3>Calendario</h3><span className="fine">Toca un día para ver su cielo</span></div>
          <div className="cal" role="grid">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i} className="cal-dow">{d}</span>)}
            {Array.from({ length: off }, (_, i) => <span key={'o' + i} />)}
            {Array.from({ length: dim }, (_, i) => {
              const ds = iso(cur.y, cur.m, i + 1), cs = rs.filter(r => r.date === ds).flatMap(r => validCards(r)), ev = moons.get(ds) || [];
              const ecl = ev.some(e => e.kind.startsWith('eclipse'));
              return (
                <button key={ds} type="button" className={`cal-day${cs.length ? ' has' : ''}${ds === todayIso() ? ' today' : ''}${ecl ? ' ecl' : ''}`} onClick={() => setDay(ds)} aria-label={`${i + 1}${ev.length ? `, ${ev.map(e => e.label).join(', ')}` : ''}${cs.length ? `: ${cs.length} cartas` : ''}`}>
                  <span className="cal-n">{i + 1}</span>
                  {ev.length > 0 && <span className="cal-moon" aria-hidden="true">{ev[ev.length - 1].icon}</span>}
                  <span className="cal-cards">{cs.slice(0, 3).map((x, k) => <TarotCard key={k} card={x} size="xs" />)}</span>
                </button>
              );
            })}
          </div>
          {moons.size > 0 && (
            <ul className="moon-legend">
              {[...moons].flatMap(([d, evs]) => evs.map(e => <li key={d + e.kind} className={e.kind.startsWith('eclipse') ? 'ecl' : ''}><button type="button" onClick={() => setDay(d)}><span aria-hidden="true">{e.icon}</span><b>{pd(d).getDate()}</b> {e.label}</button></li>))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="section-head"><h3>Palos del mes</h3></div>
          <div className="bars" role="img" aria-label={SUIT_ORDER.map(s => `${SUIT_LABEL[s]}: ${a.suit[s]}`).join(', ')}>
            {SUIT_ORDER.map((s, i) => (
              <div className="bar-col" key={s}>
                <span className="bar-val">{a.suit[s]}</span>
                <span className="bar-track"><span className="bar-fill" style={{ height: `${(a.suit[s] / maxSuit) * 100}%`, background: `var(--${s})`, animationDelay: `${i * 60}ms` }} /></span>
                <SuitIcon suit={s} size={26} />
                <span className="bar-lab">{s === 'mayor' ? 'Mayores' : SUIT_LABEL[s]}</span>
              </div>
            ))}
          </div>
          {top.length > 0 && (
            <div className="rank">
              <p className="eyebrow">Las que más salen</p>
              <ol>
                {top.map(([id, n], k) => {
                  const c = CARDS[id];
                  return (
                    <li key={id} style={{ '--suit': `var(--${c.suit})`, '--i': k } as React.CSSProperties}>
                      <span className="rank-n">{k + 1}</span>
                      <TarotCard card={{ c: id }} size="xs" />
                      <span className="rank-info"><b>{c.name}</b><span className="rank-bar"><span style={{ width: `${(n / topMax) * 100}%` }} /></span></span>
                      <SuitIcon suit={c.suit} size={20} />
                      <span className="rank-count">{n}×</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </section>
      </div>

      <section className="advice">
        <div className="advice-art"><Character kind={a.total ? SUIT_CHARACTER[domSuit] : 'nebula'} mood={enough ? 'happy' : 'sleepy'} size={170} className="float" /></div>
        <div className="advice-copy">
          <p className="eyebrow">Lo que dice tu mes</p>
          {!enough ? (
            <>
              <p className="advice-lead">{rs.length === 0 ? 'Este mes todavía está en blanco.' : `Llevas ${rs.length} ${rs.length === 1 ? 'tirada' : 'tiradas'}: aún es muy pronto para leer un patrón.`}</p>
              <p>Con unas tres tiradas empiezo a ver qué cartas vuelven, qué palo domina y qué te está queriendo decir el mes. Sigue registrando, que vamos bien.</p>
            </>
          ) : (
            <>
              <p className="advice-lead">{advice[0]}</p>
              {advice.slice(1).map((p, i) => <p key={i}>{p}</p>)}
              {repo.mode === 'live' && <button className="btn" onClick={askDeep} disabled={deep.busy}><Icon name="sparkle" size={18} />{deep.busy ? 'Leyendo el mes…' : 'Lectura profunda'}</button>}
              {deep.text && <p className="deep-text" aria-live="polite">{deep.text}</p>}
            </>
          )}
        </div>
      </section>
      {day && <DayPop date={day} ctx={ctx} readings={rs.filter(r => r.date === day)} onClose={() => setDay(null)} />}
    </div>
  );
}

function DayPop({ date, ctx, readings, onClose }: { date: string; ctx: Ctx; readings: Reading[]; onClose: () => void }) {
  const s = useMemo(() => sky(date, []), [date]);
  const ph = moonPhaseName(date), d = pd(date);
  const ev = moonEvents(d.getFullYear(), d.getMonth()).get(date) || [];
  useEffect(() => { const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet daypop" role="dialog" aria-modal="true" aria-labelledby="dp-title">
        <span className="sheet-grip" aria-hidden="true" />
        <button className="icon-btn sheet-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
        <p className="eyebrow">{d.toLocaleDateString('es-CO', { weekday: 'long' })}</p>
        <h2 id="dp-title" className="sheet-title">{d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</h2>
        <div className="dp-moon">
          <span className="dp-moon-icon" aria-hidden="true">{ev[0]?.icon || ph.icon}</span>
          <div>
            <b>{ev.length ? ev.map(e => e.label).join(' · ') : ph.name}</b>
            <p>{ev.length ? MOON_TIP[ev[ev.length - 1].kind] : ph.tip}</p>
          </div>
        </div>
        {readings.length > 0 && (
          <div className="dp-readings">
            <h3 className="detail-h">{readings.length === 1 ? 'La tirada de ese día' : 'Las tiradas de ese día'}</h3>
            {readings.map(r => (
              <button key={r.id} type="button" className="dp-reading" onClick={() => { onClose(); ctx.go('historial', ctx.viewed.handle); }}>
                <span className="dp-cards">{validCards(r).map((x, k) => <TarotCard key={k} card={x} size="sm" />)}</span>
                <span className="fine">{validCards(r).map(x => CARDS[x.c].name).join(' · ')}</span>
              </button>
            ))}
          </div>
        )}
        <h3 className="detail-h">Dónde estaban los planetas</h3>
        {!s ? <p className="muted">No pude calcular el cielo de ese día.</p> : (
          <ul className="planet-list">
            {s.map(p => (
              <li key={p.n}>
                <span className="glyph" aria-hidden="true">{PLANET_GLYPH[p.n]}</span>
                <span><b>{p.n}</b> en {SIGN_GLYPH[p.si]} {p.sign} {p.deg}°{p.rx && <em className="rx" title="Retrógrado"> ℞</em>}<span className="fine">{transitPlain(p)}</span></span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
