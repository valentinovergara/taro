import { CARDS, SUITS, type Reading, type Suit, posOf, validCards } from './tarot';
import type { Profile } from './types';

export interface MonthAnalysis {
  counts: Record<string, number>;
  ranked: [string, number][];
  suit: Record<Suit, number>;
  tags: Record<string, number>;
  areas: Record<string, Record<Suit, number>>;
  total: number; rev: number; begins: number; royals: number; days: number;
}

const zero = (): Record<Suit, number> => ({ mayor: 0, copas: 0, pentaculos: 0, espadas: 0, bastos: 0 });

export function analyze(rs: Reading[]): MonthAnalysis {
  const counts: Record<string, number> = {}, suit = zero(), tags: Record<string, number> = {}, areas: Record<string, Record<Suit, number>> = {};
  let total = 0, rev = 0, begins = 0, royals = 0;
  rs.forEach(r => {
    (r.tags || []).forEach(t => { tags[t] = (tags[t] || 0) + 1; });
    validCards(r).forEach((x, i) => {
      const c = CARDS[x.c];
      counts[c.id] = (counts[c.id] || 0) + 1; suit[c.suit]++; total++;
      if (x.r) rev++;
      if (c.suit !== 'mayor' && [1, 11, 12].includes(c.num)) begins++;
      if (c.suit !== 'mayor' && c.num >= 13) royals++;
      const p = posOf(r, i); (areas[p] = areas[p] || zero())[c.suit]++;
    });
  });
  return { counts, ranked: Object.entries(counts).sort((a, b) => b[1] - a[1]), suit, tags, areas, total, rev, begins, royals, days: new Set(rs.map(r => r.date)).size };
}

export function monthAdvice(rs: Reading[], a: MonthAnalysis, p: Profile | null): string[] {
  if (!rs.length || !a.total) return ['Cuando registres tiradas este mes, aquí aparecerá un consejo que las lea en conjunto.'];
  const meta = p?.meta || {};
  const out: string[] = [];
  const [tid, tn] = a.ranked[0], top = CARDS[tid], first = CARDS[validCards(rs[0])[0].c];
  out.push(tn > 1 ? `${top.name} se repite ${tn} veces. ${top.msg}` : `Todavía ninguna carta se repite. Abriste el mes con ${first.name}: ${first.msg.charAt(0).toLowerCase() + first.msg.slice(1)}`);
  const dom = (['copas', 'pentaculos', 'espadas', 'bastos'] as const).slice().sort((x, y) => a.suit[y] - a.suit[x])[0];
  if (a.suit.mayor / a.total >= 0.4) out.push('Casi la mitad de las cartas son Arcanos Mayores: no es un mes de detalles sino de lecciones grandes.');
  if (a.suit[dom] > 0) out.push({
    copas: `El Agua manda: el mes se juega en los vínculos${meta.love ? `. Con ${meta.love}, la pregunta` : ', y la pregunta'} no es tanto qué sienten, sino qué necesitas tú para sentirte correspondido.`,
    pentaculos: 'La Tierra manda: casa, cuerpo, trabajo y dinero. Ordenar lo concreto te va a ordenar lo emocional.',
    espadas: 'El Aire manda: mucha cabeza y mucha conversación interna. Hay algo que vale más decir que seguir ensayando en silencio.',
    bastos: `El Fuego manda: hay energía creativa disponible. Llévala a ${meta.studio || 'un proyecto tuyo'} antes de que se disperse en ansiedad.`,
  }[dom]);
  const rec = (meta.recurring || []).filter(id => a.counts[id]);
  if (rec.length) out.push(`Volvió ${rec.map(id => CARDS[id]?.name).filter(Boolean).join(' y ')}, de tus cartas recurrentes.`);
  if (a.begins / a.total >= 0.3) out.push(`Muchos comienzos (Ases, Pajes, Caballeros)${meta.patterns?.length ? `. Ojo con tu patrón: ${meta.patterns[0]}` : ''}. Elige un solo inicio y sostenlo hasta fin de mes.`);
  if (a.royals / a.total >= 0.25) out.push('Reinas y Reyes aparecen seguido: la autoridad que a veces buscas afuera ya es tuya.');
  if (a.rev / a.total >= 0.3) out.push('Muchas cartas invertidas: energía que va hacia adentro o se está bloqueando.');
  const tags = (p?.tags || []).filter(t => t !== 'Energía general' && !a.tags[t]);
  if (tags.length && Object.keys(a.tags).length) out.push(`Casi no has preguntado por ${tags.join(', ')}. A veces lo que no consultamos es lo que evitamos mirar.`);
  const AT: Record<string, string> = { Amor: 'en el amor', Trabajo: 'en el trabajo', Personal: 'en lo personal' };
  for (const ar of ['Amor', 'Trabajo', 'Personal']) {
    const o = a.areas[ar]; if (!o) continue;
    const [k, v] = Object.entries(o).sort((x, y) => y[1] - x[1])[0]; if (!v) continue;
    out.push(k === 'mayor' ? `Tus cartas de ${ar} son sobre todo Arcanos Mayores: ${AT[ar]} se juega algo grande.` : `${AT[ar].charAt(0).toUpperCase() + AT[ar].slice(1)} domina ${SUITS[k as keyof typeof SUITS].n}: el tema es ${SUITS[k as keyof typeof SUITS].area}.`);
  }
  return out;
}
