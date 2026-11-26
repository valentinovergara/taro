import { useEffect } from 'react';
import type { Ctx } from '../App';
import { CARDS, posOf, SUIT_LABEL, validCards, type Reading } from '../lib/tarot';
import { resonance, sky, transitFor, SIGN_GLYPH, SIGNS } from '../lib/astro';
import { cardInfo, readingFor } from '../lib/meanings';
import { TarotCard, Icon } from '../components/ui';

const ELEM_EMOJI: Record<string, string> = { Fuego: '🔥', Agua: '💧', Aire: '🌬️', Tierra: '🌱' };

export function CardDetail({ ctx, reading, index, onClose }: { ctx: Ctx; reading: Reading; index: number; onClose: () => void }) {
  const x = validCards(reading)[index], c = CARDS[x.c], area = posOf(reading, index), info = cardInfo(c);
  const N = ctx.viewed.natal || [];
  const tr = transitFor(area, sky(reading.date, N), N);
  const si = SIGNS.indexOf(info.astro);
  useEffect(() => { const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet detail" role="dialog" aria-modal="true" aria-labelledby="cd-title">
        <button className="icon-btn sheet-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
        <div className="detail-grid">
          <TarotCard card={x} size="lg" />
          <div>
            <span className="chip" style={{ background: `var(--${c.suit})`, color: 'var(--on-accent)' }}>{area} · {SUIT_LABEL[c.suit]}</span>
            <h2 id="cd-title" className="detail-title">{c.name}{x.r && <em> invertida</em>}</h2>
            <div className="detail-tags">
              <span className="chip">{si >= 0 ? SIGN_GLYPH[si] + ' ' : '✦ '}{info.astro}</span>
              <span className="chip">{ELEM_EMOJI[info.element]} {info.element}</span>
            </div>
            <h3 className="detail-h">Su energía</h3>
            <p>{info.energy}</p>
            <h3 className="detail-h">En {area === 'Personal' ? 'lo personal' : area === 'Amor' ? 'el amor' : area === 'Trabajo' ? 'el trabajo' : `"${area}"`}</h3>
            <p>{readingFor(c, area)}{x.r ? ' Al salir invertida, esta energía está más bloqueada o se vive hacia adentro.' : ''}</p>
            {N.length > 0 && <><h3 className="detail-h">Con tu carta natal</h3><p className="muted">{resonance(c, N)}</p></>}
            {tr && <p className="detail-sky"><Icon name="sky" size={18} /> Ese día en el cielo: {tr}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
