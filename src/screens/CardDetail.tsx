import { useEffect } from 'react';
import type { Ctx } from '../App';
import { CARDS, posOf, SUIT_LABEL, validCards, type Reading } from '../lib/tarot';
import { resonance, sky, transitFor } from '../lib/astro';
import { TarotCard, Icon } from '../components/ui';

export function CardDetail({ ctx, reading, index, onClose }: { ctx: Ctx; reading: Reading; index: number; onClose: () => void }) {
  const x = validCards(reading)[index], c = CARDS[x.c], area = posOf(reading, index);
  const N = ctx.viewed.natal || [];
  const tr = transitFor(area, sky(reading.date, N), N);
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
            <p className="detail-kw">{c.kw}</p>
            <p>{c.msg}</p>
            <p className="muted">{resonance(c, N)}</p>
            {tr && <p className="detail-sky"><Icon name="sky" size={18} /> {tr}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
