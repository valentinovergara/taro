import type { Ctx } from '../App';
import { dominantSuit, type Reading } from '../lib/tarot';
import { dailyRecs } from '../lib/recs';
import { Icon } from './ui';
import { todayIso } from '../screens/Today';

const KIND = { song: { label: 'Canción', icon: 'music', cta: 'Escuchar' }, book: { label: 'Libro', icon: 'book', cta: 'Ver libro' }, movie: { label: 'Película', icon: 'film', cta: 'Dónde verla' } } as const;

/** Recomendación del día: una canción, un libro y una película según la energía de tu tirada. */
export function Recs({ ctx, today }: { ctx: Ctx; today: Reading | null }) {
  const recs = dailyRecs(todayIso(), dominantSuit(today), ctx.snap.me?.id || '');
  return (
    <section className="recs" aria-labelledby="recs-title">
      <div className="section-head"><h2 id="recs-title" className="h2">Para hoy</h2><p className="fine">{recs.reason}</p></div>
      <div className="recs-row">
        {recs.items.map(it => (
          <a key={it.kind} className={`rec rec-${it.kind}`} href={it.url} target="_blank" rel="noopener noreferrer">
            <span className="rec-icon" aria-hidden="true"><Icon name={KIND[it.kind].icon} size={22} /></span>
            <span className="rec-kind">{KIND[it.kind].label}</span>
            <b className="rec-title">{it.title}</b>
            <span className="rec-by">{it.by}</span>
            <span className="rec-cta">{KIND[it.kind].cta} <Icon name="right" size={14} /></span>
          </a>
        ))}
      </div>
    </section>
  );
}
