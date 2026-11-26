import { useMemo, useState } from 'react';
import type { Ctx } from '../App';
import { CARDS, SUIT_LABEL, SUIT_ORDER, validCards, posOf, type Suit } from '../lib/tarot';
import { analyze, monthAdvice } from '../lib/analysis';
import { skyLine } from '../lib/astro';
import { Character, SUIT_CHARACTER } from '../components/Character';
import { TarotCard, Icon } from '../components/ui';
import { supabase, repo } from '../lib/repo';
import { todayIso } from './Today';

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export function Month({ ctx }: { ctx: Ctx }) {
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const prefix = iso(cur.y, cur.m, 1).slice(0, 7);
  const rs = useMemo(() => ctx.readings.filter(r => r.date.startsWith(prefix)).sort((a, b) => (a.date < b.date ? -1 : 1)), [ctx.readings, prefix]);
  const a = useMemo(() => analyze(rs), [rs]);
  const advice = useMemo(() => monthAdvice(rs, a, ctx.viewed, ctx.meta), [rs, a, ctx.viewed, ctx.meta]);
  const maxSuit = Math.max(1, ...SUIT_ORDER.map(s => a.suit[s]));
  const domSuit = (SUIT_ORDER.slice().sort((x, y) => a.suit[y] - a.suit[x])[0]) as Suit;
  const step = (d: number) => setCur(c => { const m = c.m + d; return { y: c.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 }; });
  const off = (new Date(cur.y, cur.m, 1).getDay() + 6) % 7, dim = new Date(cur.y, cur.m + 1, 0).getDate();
  const [deep, setDeep] = useState<{ busy: boolean; text: string }>({ busy: false, text: '' });

  async function askDeep() {
    if (!supabase) return;
    setDeep({ busy: true, text: '' });
    const lines = rs.map(r => `${r.date} {cielo: ${skyLine(r.date)}} [${r.tags.join(', ') || 'sin tema'}]: ` + validCards(r).map((x, i) => `${posOf(r, i)}=${CARDS[x.c].name}${x.r ? ' (invertida)' : ''}`).join('; ') + (r.note ? ` — nota: ${r.note}` : '')).join('\n');
    const { data, error } = await supabase.functions.invoke('deep-reading', { body: { name: ctx.viewed.display_name, natal: ctx.viewed.natal, context: ctx.isMine ? ctx.snap.context : '', lines } });
    setDeep({ busy: false, text: error ? 'La lectura profunda aún no está activada (falta desplegar la función en Supabase).' : String(data?.text || '') });
  }

  return (
    <div className="screen month">
      <header className="month-head">
        <div>
          <p className="eyebrow">Panorama de {ctx.viewed.display_name}</p>
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
          <div className="section-head"><h3>Calendario</h3></div>
          <div className="cal" role="grid">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i} className="cal-dow">{d}</span>)}
            {Array.from({ length: off }, (_, i) => <span key={'o' + i} />)}
            {Array.from({ length: dim }, (_, i) => {
              const ds = iso(cur.y, cur.m, i + 1), dr = rs.filter(r => r.date === ds), cs = dr.flatMap(r => validCards(r));
              return (
                <button key={ds} className={`cal-day${cs.length ? ' has' : ''}${ds === todayIso() ? ' today' : ''}`} disabled={!cs.length} onClick={() => ctx.go('historial')} aria-label={`${i + 1}${cs.length ? `: ${cs.length} cartas` : ''}`}>
                  <span className="cal-n">{i + 1}</span>
                  <span className="cal-cards">{cs.slice(0, 3).map((x, k) => <TarotCard key={k} card={x} size="xs" />)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="section-head"><h3>Palos del mes</h3></div>
          <div className="bars" role="img" aria-label={SUIT_ORDER.map(s => `${SUIT_LABEL[s]}: ${a.suit[s]}`).join(', ')}>
            {SUIT_ORDER.map((s, i) => (
              <div className="bar-col" key={s}>
                <span className="bar-val">{a.suit[s]}</span>
                <span className="bar-track"><span className="bar-fill" style={{ height: `${(a.suit[s] / maxSuit) * 100}%`, background: `var(--${s})`, animationDelay: `${i * 60}ms` }} /></span>
                <span className="bar-lab">{s === 'mayor' ? 'Mayores' : SUIT_LABEL[s]}</span>
              </div>
            ))}
          </div>
          {a.ranked[0] && (
            <div className="dominant">
              <TarotCard card={{ c: a.ranked[0][0] }} size="sm" />
              <div>
                <p className="eyebrow">La que más vuelve</p>
                <p className="dominant-name">{CARDS[a.ranked[0][0]].name}</p>
                <p className="muted">{a.ranked[0][1]} {a.ranked[0][1] === 1 ? 'vez' : 'veces'} · {CARDS[a.ranked[0][0]].kw}</p>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="advice">
        <div className="advice-art"><Character kind={a.total ? SUIT_CHARACTER[domSuit] : 'nebula'} mood="happy" size={170} className="float" /></div>
        <div className="advice-copy">
          <p className="eyebrow">Consejo del mes</p>
          <p className="advice-lead">{advice[0]}</p>
          {advice.slice(1).map((p, i) => <p key={i}>{p}</p>)}
          {repo.mode === 'live' && rs.length > 0 && <button className="btn" onClick={askDeep} disabled={deep.busy}><Icon name="sparkle" size={18} />{deep.busy ? 'Leyendo el mes…' : 'Lectura profunda'}</button>}
          {deep.text && <p className="deep-text" aria-live="polite">{deep.text}</p>}
        </div>
      </section>
    </div>
  );
}
