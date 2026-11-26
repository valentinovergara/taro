import type { ReactNode, CSSProperties } from 'react';
import { CARDS, cardImg, type DrawnCard } from '../lib/tarot';

const P: Record<string, ReactNode> = {
  today: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  month: <><rect x="3.5" y="5" width="17" height="15" rx="4" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>,
  history: <><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v3.5h3.5M12 8v4.5l3 2" /></>,
  sky: <><circle cx="12" cy="12" r="5" /><path d="M3 14.5c2.5 2 15.5-2.6 18-6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  edit: <><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>,
  trash: <><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></>,
  sparkle: <path d="M12 3c.8 4.5 2.5 6.2 7 7-4.5.8-6.2 2.5-7 7-.8-4.5-2.5-6.2-7-7 4.5-.8 6.2-2.5 7-7z" />,
  flip: <><path d="M7 4l-3 3 3 3" /><path d="M4 7h11a5 5 0 0 1 0 10h-3" /></>,
  user: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
  out: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
  chart: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><path d="M12 3.5v4.5M12 16v4.5M3.5 12H8M16 12h4.5" /></>,
  shuffle: <><path d="M4 7h3c4 0 6 10 10 10h3M4 17h3c1.6 0 2.8-1.4 3.8-3.2M14.2 10.2C15.2 8.4 16.4 7 18 7h2" /><path d="M18 4.5L20.5 7 18 9.5M18 14.5l2.5 2.5-2.5 2.5" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
};
export function Icon({ name, size = 22 }: { name: keyof typeof P | string; size?: number }) {
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[name]}</svg>;
}

export function TarotCard({ card, i = 0, size = 'md', deal = false, onClick, label }: { card: DrawnCard; i?: number; size?: 'xs' | 'sm' | 'md' | 'lg'; deal?: boolean; onClick?: () => void; label?: string }) {
  const c = CARDS[card.c]; if (!c) return null;
  const alt = `${c.name}${card.r ? ', invertida' : ''}`;
  const inner = (
    <span className={`tcard tcard-${size}${card.r ? ' is-rev' : ''}${deal ? ' is-deal' : ''}`} style={{ '--i': i, '--suit': `var(--${c.suit})` } as CSSProperties}>
      <img src={cardImg(c.id)} alt={alt} loading={size === 'xs' ? 'lazy' : 'eager'} draggable={false} />
    </span>
  );
  if (!onClick) return inner;
  return <button type="button" className="tcard-btn" onClick={onClick} aria-label={label || `Ver ${alt}`}>{inner}</button>;
}

export function SuitDot({ suit }: { suit: string }) { return <span className="suit-dot" style={{ background: `var(--${suit})` }} aria-hidden="true" />; }

export function Avatar({ name, accent, size = 32 }: { name: string; accent: string; size?: number }) {
  return <span className="avatar" style={{ width: size, height: size, background: `radial-gradient(circle at 35% 30%, #fff 0%, ${accent} 55%, color-mix(in srgb, ${accent} 70%, #3b2547) 100%)`, fontSize: size * 0.42 }} aria-hidden="true">{name.charAt(0).toUpperCase()}</span>;
}
