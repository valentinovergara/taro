import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Character, SUIT_CHARACTER } from '../components/Character';
import { CARDS, SUIT_LABEL, cardImg, dominantSuit, energyLine, posOf, validCards, type Reading } from './tarot';

const W = 1080, H = 1920;
const SUIT_HEX: Record<string, string> = { copas: '#F5A9CE', pentaculos: '#F3D375', espadas: '#94BFF2', bastos: '#F7AC87', mayor: '#BE9AEA' };

const load = (src: string) => new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(' '), lines: string[] = []; let line = '';
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > max && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  return lines;
}
function pill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, bg: string) {
  ctx.font = '600 30px Inter, sans-serif';
  const w = ctx.measureText(text).width + 48, h = 54;
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
  ctx.fillStyle = '#1f1a2b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 1);
}

/** Imagen 1080×1920 para historias de Instagram: cartas flotando, la energía del día y el logo de Taro. */
export async function makeStory(r: Reading, name: string): Promise<Blob> {
  await Promise.all(['700 96px Fraunces', 'italic 600 60px Fraunces', '600 32px Inter', '500 32px Inter'].map(f => document.fonts.load(f).catch(() => null)));
  const cs = validCards(r), suit = dominantSuit(r) || 'mayor';
  const imgs = await Promise.all(cs.map(x => load(cardImg(x.c))));
  const svg = renderToStaticMarkup(createElement(Character, { kind: SUIT_CHARACTER[suit], size: 300, className: '' }));
  const ch = await load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.includes('xmlns=') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'))).catch(() => null);

  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!;

  // Fondo nacarado
  const bg = c.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#fff1f7'); bg.addColorStop(.4, '#f3eaff'); bg.addColorStop(.75, '#e8f4ff'); bg.addColorStop(1, '#e9fbf2');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  const blob = (x: number, y: number, r: number, col: string) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); };
  blob(80, 160, 620, 'rgba(255,214,190,.85)'); blob(1020, 520, 560, SUIT_HEX[suit] + 'aa'); blob(300, 1700, 700, 'rgba(205,240,226,.9)');
  // Destellos
  let seed = [...r.id].reduce((a, ch2) => a + ch2.charCodeAt(0), 7);
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  c.fillStyle = '#ffffff';
  for (let i = 0; i < 46; i++) { const x = rnd() * W, y = rnd() * H, s = 2 + rnd() * 5; c.globalAlpha = .5 + rnd() * .5; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); }
  c.globalAlpha = 1;
  const star = (x: number, y: number, s: number, col: string) => { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? s * .28 : s; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); };
  star(150, 1180, 34, '#ffffff'); star(940, 1260, 26, '#ffffff'); star(880, 300, 22, '#ffffff');

  // Logo
  const orb = c.createRadialGradient(118, 128, 4, 130, 140, 40);
  orb.addColorStop(0, '#fff'); orb.addColorStop(.35, '#f5a9ce'); orb.addColorStop(.7, '#b58ce7'); orb.addColorStop(1, '#69cda6');
  c.fillStyle = orb; c.beginPath(); c.arc(130, 140, 38, 0, 7); c.fill();
  c.fillStyle = '#1f1a2b'; c.font = '700 68px Fraunces, Georgia, serif'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('Taro', 186, 144);
  const [y, m, d] = r.date.split('-').map(Number), dt = new Date(y, m - 1, d);
  c.font = '500 32px Inter, sans-serif'; c.fillStyle = '#4f4860'; c.textAlign = 'right';
  c.fillText(dt.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }), W - 80, 144);

  // Energía
  if (ch) c.drawImage(ch, W / 2 - 120, 230, 240, 240);
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.font = '600 32px Inter, sans-serif'; c.fillStyle = '#6a3fb0'; c.fillText(`La energía de hoy · ${SUIT_LABEL[suit] || 'Arcanos Mayores'}`, W / 2, 530);
  c.font = '700 92px Fraunces, Georgia, serif'; c.fillStyle = '#1f1a2b';
  const lines = wrap(c, energyLine(r), W - 180);
  lines.forEach((l, i) => c.fillText(l, W / 2, 640 + i * 104));
  const top = 640 + (lines.length - 1) * 104 + 90;

  // Cartas flotando
  const n = cs.length, cw = n <= 3 ? 280 : n === 4 ? 220 : n === 5 ? 180 : 150, chh = cw * 527 / 300;
  const gap = n <= 3 ? 6 : 4, total = n * cw + (n - 1) * gap, x0 = (W - total) / 2;
  const cardTop = Math.max(top, 860);
  const order = cs.map((_, i) => i).sort((a, b) => Math.abs(b - (n - 1) / 2) - Math.abs(a - (n - 1) / 2));
  order.forEach(i => {
    const x = cs[i];
    const mid = (n - 1) / 2, k = i - mid, rot = k * (n <= 3 ? 7 : 5) * Math.PI / 180, lift = Math.abs(k) * 46;
    const cx = x0 + i * (cw + gap) + cw / 2, cy = cardTop + chh / 2 + lift;
    c.save(); c.translate(cx, cy); c.rotate(rot);
    c.shadowColor = 'rgba(59, 37, 71, .35)'; c.shadowBlur = 50; c.shadowOffsetY = 28;
    c.fillStyle = '#fff'; c.beginPath(); c.roundRect(-cw / 2 - 10, -chh / 2 - 10, cw + 20, chh + 20, 22); c.fill();
    c.shadowColor = 'transparent';
    if (x.r) c.rotate(Math.PI);
    c.drawImage(imgs[i], -cw / 2, -chh / 2, cw, chh);
    c.restore();
    const ly = cardTop + chh + lift + 70;
    pill(c, cx, ly, posOf(r, i), SUIT_HEX[CARDS[x.c].suit]);
    c.font = '600 28px Inter, sans-serif'; c.fillStyle = '#1f1a2b'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    wrap(c, CARDS[x.c].name + (x.r ? ' ⟲' : ''), cw + 10).slice(0, 2).forEach((l, j) => c.fillText(l, cx, ly + 66 + j * 36));
  });

  // Pie
  c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.roundRect(150, H - 210, W - 300, 110, 55); c.fill();
  c.fillStyle = '#1f1a2b'; c.font = 'italic 600 40px Fraunces, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(`La tirada de ${name} en Taro ✦`, W / 2, H - 155);

  return new Promise((ok, ko) => cv.toBlob(b => (b ? ok(b) : ko(new Error('canvas'))), 'image/png'));
}
