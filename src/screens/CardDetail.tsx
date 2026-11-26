import { useEffect, useState } from 'react';
import type { Ctx } from '../App';
import { CARDS, posOf, SUIT_LABEL, validCards, type Reading } from '../lib/tarot';
import { resonance, sky, transitFor, SIGN_GLYPH, SIGNS, PLANET_GLYPH } from '../lib/astro';
import { cardInfo, readingFor } from '../lib/meanings';
import { Icon, SuitIcon } from '../components/ui';
import { cardImg } from '../lib/tarot';

const ELEM_COLOR: Record<string, string> = { Fuego: 'var(--bastos)', Agua: 'var(--copas)', Aire: 'var(--espadas)', Tierra: 'var(--pentaculos)' };
const ELEM_TXT: Record<string, string> = { Fuego: 'acción y deseo', Agua: 'emociones e intuición', Aire: 'mente y palabra', Tierra: 'cuerpo y lo concreto' };
const AREA: Record<string, { icon: string; title: string }> = {
  Amor: { icon: 'heart', title: 'En el amor' }, Trabajo: { icon: 'work', title: 'En el trabajo' }, Personal: { icon: 'user', title: 'En lo personal' },
  Familia: { icon: 'users', title: 'En la familia' }, Sombra: { icon: 'moonph', title: 'En tu sombra' }, Síntesis: { icon: 'sparkle', title: 'Como síntesis' },
};

/** La carta, con calma: su energía, lo que dice en su lugar de la tirada y cómo conversa con tu carta natal y el cielo. */
export function CardDetail({ ctx, reading, index, onClose }: { ctx: Ctx; reading: Reading; index: number; onClose: () => void }) {
  const all = validCards(reading);
  const [i, setI] = useState(index);
  const x = all[i], c = CARDS[x.c], area = posOf(reading, i), info = cardInfo(c);
  const N = ctx.viewed.natal || [];
  const tr = transitFor(area, sky(reading.date, N), N);
  const si = SIGNS.indexOf(info.astro), planet = PLANET_GLYPH[info.astro];
  const ar = AREA[area] || { icon: 'sparkle', title: `En "${area}"` };
  const go = (d: number) => setI(k => (k + d + all.length) % all.length);
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  });

  return (
    <div className="sheet-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet detail" role="dialog" aria-modal="true" aria-labelledby="cd-title" style={{ '--suit': `var(--${c.suit})` } as React.CSSProperties}>
        <button className="icon-btn sheet-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
        <div className="detail-stage">
          <span className="detail-glow" aria-hidden="true" />
          <span className="detail-spark s1" aria-hidden="true">✦</span><span className="detail-spark s2" aria-hidden="true">✧</span><span className="detail-spark s3" aria-hidden="true">✦</span>
          <div className="detail-card" key={x.c}><img src={cardImg(x.c)} alt={c.name} className={x.r ? 'is-rev' : ''} /></div>
          {all.length > 1 && (
            <div className="detail-nav">
              <button type="button" className="icon-btn icon-btn-sm" onClick={() => go(-1)} aria-label="Carta anterior"><Icon name="left" size={18} /></button>
              <span className="detail-dots">{all.map((_, k) => <button key={k} type="button" aria-label={`Carta ${k + 1}: ${posOf(reading, k)}`} aria-current={k === i} onClick={() => setI(k)} />)}</span>
              <button type="button" className="icon-btn icon-btn-sm" onClick={() => go(1)} aria-label="Carta siguiente"><Icon name="right" size={18} /></button>
            </div>
          )}
        </div>

        <div className="detail-body" key={i}>
          <p className="detail-pos"><SuitIcon suit={c.suit} size={18} />{area} · {SUIT_LABEL[c.suit] || 'Arcano Mayor'}</p>
          <h2 id="cd-title" className="detail-title">{c.name}</h2>
          {x.r && <span className="chip detail-rev"><Icon name="flip" size={14} />Salió invertida</span>}
          <div className="detail-tags">
            <span className="chip chip-astro" title="Su correspondencia astrológica">{si >= 0 ? SIGN_GLYPH[si] : planet || '✦'} {info.astro}</span>
            <span className="chip chip-elem" style={{ '--el': ELEM_COLOR[info.element] } as React.CSSProperties} title={ELEM_TXT[info.element]}><i aria-hidden="true" />{info.element} · {ELEM_TXT[info.element]}</span>
          </div>

          <blockquote className="detail-energy">
            <span className="eyebrow">Su energía</span>
            {info.energy}
          </blockquote>

          <section className="detail-area">
            <span className="detail-area-icon"><Icon name={ar.icon} size={20} /></span>
            <div>
              <h3>{ar.title}</h3>
              <p>{readingFor(c, area)}</p>
              {x.r && <p className="muted">Al salir invertida, esta energía se vive más hacia adentro o algo la está frenando. No es mala señal: es una invitación a mirarla con suavidad.</p>}
            </div>
          </section>

          {N.length > 0 && (
            <section className="detail-extra">
              <h3><span aria-hidden="true">☉</span> Con tu carta natal</h3>
              <p>{resonance(c, N)}</p>
            </section>
          )}
          {tr && (
            <section className="detail-extra detail-sky">
              <h3><Icon name="sky" size={16} /> Ese día en el cielo</h3>
              <p>{tr}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
