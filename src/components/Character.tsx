import { useId } from 'react';
import type { Suit } from '../lib/tarot';

export type CharacterKind = 'sun' | 'moon' | 'star' | 'planet' | 'comet' | 'nebula';
type Mood = 'happy' | 'sleepy' | 'wink';

const PAL: Record<CharacterKind, { hi: string; mid: string; lo: string; aura: [string, string] }> = {
  sun:    { hi: '#fff3c4', mid: '#ffc457', lo: '#f5893a', aura: ['#ffe2a8', '#ffd0b5'] },
  moon:   { hi: '#ffeede', mid: '#ffbf93', lo: '#f08f73', aura: ['#ffd9c4', '#f3d6ff'] },
  star:   { hi: '#fff6d6', mid: '#ffd66b', lo: '#f7a07a', aura: ['#fff0b8', '#ffd3e6'] },
  planet: { hi: '#f4eaff', mid: '#c4a0f2', lo: '#8c5fd8', aura: ['#e7d9ff', '#ffd9ec'] },
  comet:  { hi: '#e6fff5', mid: '#8fdcc0', lo: '#4ea3c9', aura: ['#ccf3e4', '#d6e8ff'] },
  nebula: { hi: '#ffffff', mid: '#f7b6d8', lo: '#9fb8f5', aura: ['#ffe0ee', '#d8f5ec'] },
};

export const SUIT_CHARACTER: Record<Suit, CharacterKind> = { mayor: 'planet', copas: 'moon', pentaculos: 'sun', espadas: 'comet', bastos: 'star' };

/** Personaje glossy de gel translúcido con cara mínima. Puramente decorativo. */
export function Character({ kind, mood = 'happy', size = 200, aura = true, className = '' }: { kind: CharacterKind; mood?: Mood; size?: number; aura?: boolean; className?: string }) {
  const id = useId().replace(/:/g, '');
  const p = PAL[kind];
  const body = `url(#b${id})`;
  const face = (cx: number, cy: number, s = 1) => {
    const ex = 14 * s, ey = cy - 2 * s, w = 7 * s;
    const eye = (x: number, closed: boolean) => closed
      ? <path d={`M${x - w} ${ey} q${w} ${w * 1.1} ${w * 2} 0`} />
      : <path d={`M${x - w} ${ey + 2} q${w} ${-w * 1.2} ${w * 2} 0`} />;
    return (
      <g className="ch-face" fill="none" stroke="#3b2547" strokeWidth={3.6 * s} strokeLinecap="round">
        {eye(cx - ex, mood === 'sleepy')}
        {mood === 'wink' ? <path d={`M${cx + ex - w} ${ey} h${w * 2}`} /> : eye(cx + ex, mood === 'sleepy')}
        <path d={`M${cx - 5 * s} ${cy + 9 * s} q${5 * s} ${5 * s} ${10 * s} 0`} />
        <circle cx={cx - ex - 6 * s} cy={cy + 8 * s} r={5 * s} fill="#ff8fb1" stroke="none" opacity=".35" />
        <circle cx={cx + ex + 6 * s} cy={cy + 8 * s} r={5 * s} fill="#ff8fb1" stroke="none" opacity=".35" />
      </g>
    );
  };
  const gloss = (cx: number, cy: number, rx: number, ry: number) => (
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" opacity=".75" filter={`url(#g${id})`} />
  );

  let shape: React.ReactNode = null;
  if (kind === 'sun') {
    const petals = Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * Math.PI * 2; return <circle key={i} cx={100 + Math.cos(a) * 46} cy={102 + Math.sin(a) * 46} r={24} />; });
    shape = <><g fill={body}>{petals}<circle cx="100" cy="102" r="50" /></g>{gloss(82, 74, 20, 10)}{face(100, 106)}</>;
  } else if (kind === 'moon') {
    shape = <><path fill={body} d="M128 40a64 64 0 1 0 34 104A52 52 0 0 1 128 40z" />{gloss(70, 66, 16, 9)}{face(86, 108)}</>;
  } else if (kind === 'star') {
    shape = <><path fill={body} stroke={body} strokeWidth="22" strokeLinejoin="round" d="M100 34l18 38 41 5-30 28 8 41-37-20-37 20 8-41-30-28 41-5z" />{gloss(84, 70, 16, 8)}{face(100, 106)}</>;
  } else if (kind === 'planet') {
    shape = <>
      <ellipse cx="100" cy="112" rx="88" ry="26" fill="none" stroke={`url(#r${id})`} strokeWidth="9" opacity=".55" />
      <circle cx="100" cy="100" r="56" fill={body} />
      <path d="M12 112a88 26 0 0 0 176 0" fill="none" stroke={`url(#r${id})`} strokeWidth="9" opacity=".9" />
      {gloss(80, 70, 20, 11)}{face(100, 96)}
    </>;
  } else if (kind === 'comet') {
    shape = <>
      <path d="M118 84C150 50 178 34 196 26c-12 22-30 52-58 86z" fill={`url(#t${id})`} opacity=".85" />
      <circle cx="94" cy="112" r="52" fill={body} />{gloss(76, 86, 18, 10)}{face(94, 114)}
    </>;
  } else {
    shape = <>
      <g clipPath={`url(#c${id})`}>
        <circle cx="100" cy="100" r="62" fill="#f9d1e6" />
        <circle cx="70" cy="80" r="46" fill="#ffd58a" opacity=".85" filter={`url(#s${id})`} />
        <circle cx="132" cy="92" r="44" fill="#9fc3ff" opacity=".9" filter={`url(#s${id})`} />
        <circle cx="96" cy="140" r="42" fill="#8fe3c4" opacity=".85" filter={`url(#s${id})`} />
        <circle cx="120" cy="126" r="30" fill="#e39cf0" opacity=".7" filter={`url(#s${id})`} />
      </g>
      <circle cx="100" cy="100" r="62" fill={`url(#n${id})`} />
      {gloss(78, 66, 20, 10)}{face(100, 104)}
    </>;
  }

  return (
    <svg className={`character ${className}`} viewBox="0 0 200 200" width={size} height={size} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`b${id}`} cx="0.36" cy="0.3" r="0.8" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor={p.hi} /><stop offset="0.45" stopColor={p.mid} /><stop offset="1" stopColor={p.lo} />
        </radialGradient>
        <radialGradient id={`n${id}`} cx="0.4" cy="0.35" r="0.7"><stop offset="0.6" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" stopOpacity=".55" /></radialGradient>
        <linearGradient id={`r${id}`} x1="0" x2="1"><stop offset="0" stopColor="#ffc3dd" /><stop offset=".5" stopColor="#fff2c2" /><stop offset="1" stopColor="#b9e8ff" /></linearGradient>
        <linearGradient id={`t${id}`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor={p.mid} /><stop offset="1" stopColor={p.aura[1]} stopOpacity="0" /></linearGradient>
        <radialGradient id={`a${id}`}><stop offset="0" stopColor={p.aura[0]} /><stop offset=".6" stopColor={p.aura[1]} stopOpacity=".55" /><stop offset="1" stopColor={p.aura[1]} stopOpacity="0" /></radialGradient>
        <clipPath id={`c${id}`}><circle cx="100" cy="100" r="62" /></clipPath>
        <filter id={`g${id}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" /></filter>
        <filter id={`s${id}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14" /></filter>
        <filter id={`h${id}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" /></filter>
      </defs>
      {aura && <circle className="ch-aura" cx="100" cy="100" r="98" fill={`url(#a${id})`} />}
      <ellipse className="ch-shadow" cx="100" cy="182" rx="46" ry="7" fill={p.lo} opacity=".28" filter={`url(#h${id})`} />
      <g className="ch-body">{shape}</g>
    </svg>
  );
}
