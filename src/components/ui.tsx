import type { ReactNode, CSSProperties } from 'react';
import { CARDS, cardImg, type DrawnCard } from '../lib/tarot';
import { Character, type CharacterKind } from './Character';

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
  comment: <path d="M4 5.5h16v10H9l-4 3.5v-3.5H4z" />,
  users: <><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19c.7-3 3-4.8 6-4.8s5.3 1.8 6 4.8" /><circle cx="17" cy="9" r="2.6" /><path d="M16.5 14.3c2.4.2 4 1.7 4.5 4.2" /></>,
  music: <><path d="M9 18V5l11-2v13" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>,
  book: <><path d="M4 5c3-1.3 5.5-1 8 .8 2.5-1.8 5-2.1 8-.8v14c-3-1.3-5.5-1-8 .8-2.5-1.8-5-2.1-8-.8z" /><path d="M12 5.8v14" /></>,
  film: <><rect x="3.5" y="5" width="17" height="14" rx="3" /><path d="M3.5 9.5h17M3.5 14.5h17M8 5v14M16 5v14" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  down: <path d="M6 9l6 6 6-6" />,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></>,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  moonph: <path d="M15 4a8 8 0 1 0 5 13A7 7 0 0 1 15 4z" />,
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

export function Avatar({ name, accent, size = 32, kind }: { name: string; accent: string; size?: number; kind?: CharacterKind | null }) {
  if (kind) return <span className="avatar avatar-ch" style={{ width: size, height: size, background: `radial-gradient(circle at 50% 40%, #fff, color-mix(in srgb, ${accent} 35%, #fff))` }} aria-hidden="true"><Character kind={kind} size={size * 1.05} aura={false} /></span>;
  return <span className="avatar" style={{ width: size, height: size, background: `radial-gradient(circle at 35% 30%, #fff 0%, ${accent} 55%, color-mix(in srgb, ${accent} 70%, #3b2547) 100%)`, fontSize: size * 0.42 }} aria-hidden="true">{name.charAt(0).toUpperCase()}</span>;
}

const SUIT_PATH: Record<string, ReactNode> = {
  copas: <><path d="M6 4h12v3a6 6 0 0 1-12 0z" /><path d="M12 13v5M8 20h8" /></>,
  pentaculos: <><circle cx="12" cy="12" r="8" /><path d="M12 6.5l1.6 3.6 3.9.4-2.9 2.6.8 3.9-3.4-2-3.4 2 .8-3.9-2.9-2.6 3.9-.4z" /></>,
  espadas: <><path d="M12 2.5l2 3v10h-4v-10z" /><path d="M7 15.5h10M12 15.5v6" /></>,
  bastos: <><path d="M9 21L15.5 4" /><path d="M14.6 6.5l2.6.4M13.4 10l2.4.9M17 3.2c.6 1-.2 2.3-1.5 1.8" /><circle cx="15.8" cy="3.6" r="1.4" /></>,
  mayor: <path d="M12 3l2.4 5.6 6 .6-4.6 4 1.4 6-5.2-3.2L6.8 19.2l1.4-6-4.6-4 6-.6z" />,
};
/** Icono del palo, relleno con su color. */
export function SuitIcon({ suit, size = 22 }: { suit: string; size?: number }) {
  return <svg className="suit-icon" width={size} height={size} viewBox="0 0 24 24" fill={`var(--${suit})`} stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">{SUIT_PATH[suit]}</svg>;
}
