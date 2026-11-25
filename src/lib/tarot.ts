export type Suit = 'mayor' | 'copas' | 'pentaculos' | 'espadas' | 'bastos';
export interface CardDef { id: string; name: string; suit: Suit; num: number; kw: string; msg: string; label: string }
export interface DrawnCard { c: string; r?: boolean }

export const ROMAN = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];

const MAJ: [string, string, string][] = [
  ['El Loco','salto, inicio, confianza','Da el paso aunque no veas todo el camino.'],
  ['El Mago','voluntad, recursos, acción','Ya tienes las herramientas: úsalas.'],
  ['La Sacerdotisa','intuición, silencio, saber interno','Escucha lo que sabes antes de preguntar afuera.'],
  ['La Emperatriz','abundancia, cuerpo, creación','Crea desde el placer y el cuidado, no desde la exigencia.'],
  ['El Emperador','estructura, límites, autoridad','Pon orden y límites claros: eso también es amor.'],
  ['El Hierofante','tradición, guía, compromiso','Revisa a qué reglas sigues siendo fiel y por qué.'],
  ['Los Enamorados','elección, vínculo, valores','Elige desde tus valores, no desde el miedo a perder.'],
  ['El Carro','dirección, avance, control','Define hacia dónde vas y sostén el rumbo.'],
  ['La Fuerza','temple, ternura, coraje','La suavidad firme puede más que la fuerza.'],
  ['El Ermitaño','introspección, pausa, búsqueda','Date tiempo a solas para oírte.'],
  ['La Rueda de la Fortuna','ciclos, giro, destino','Algo está girando: acompáñalo sin aferrarte.'],
  ['La Justicia','verdad, equilibrio, consecuencia','Sé honesto con lo que das y lo que recibes.'],
  ['El Colgado','pausa, rendición, otra mirada','Suelta el control y mira la situación al revés.'],
  ['La Muerte','cierre, transformación, soltar','Deja morir lo que ya cumplió su ciclo.'],
  ['La Templanza','mezcla, paciencia, sanación','Ve despacio y combina, no elijas extremos.'],
  ['El Diablo','apego, deseo, patrón','Nombra el patrón que te ata para poder soltarlo.'],
  ['La Torre','ruptura, revelación, sacudida','Lo que se cae estaba mal construido: deja que caiga.'],
  ['La Estrella','esperanza, sanación, fe','Confía: después de la tormenta, algo está sanando.'],
  ['La Luna','ilusión, miedo, sueño','No todo lo que temes es real: espera a que aclare.'],
  ['El Sol','claridad, alegría, vitalidad','Muéstrate: tu luz no necesita permiso.'],
  ['El Juicio','llamado, renacer, decisión','Responde al llamado que llevas tiempo oyendo.'],
  ['El Mundo','cierre, logro, plenitud','Celebra lo cumplido antes de empezar lo siguiente.'],
];

export const SUITS: Record<Exclude<Suit, 'mayor'>, { n: string; el: string; area: string }> = {
  copas: { n: 'Copas', el: 'Agua', area: 'emociones y vínculos' },
  pentaculos: { n: 'Pentáculos', el: 'Tierra', area: 'cuerpo, casa, trabajo y dinero' },
  espadas: { n: 'Espadas', el: 'Aire', area: 'mente, palabras y decisiones' },
  bastos: { n: 'Bastos', el: 'Fuego', area: 'creación, deseo y energía' },
};
export const SUIT_LABEL: Record<Suit, string> = { mayor: 'Arcanos mayores', copas: 'Copas', pentaculos: 'Pentáculos', espadas: 'Espadas', bastos: 'Bastos' };
export const SUIT_ORDER: Suit[] = ['mayor', 'copas', 'pentaculos', 'espadas', 'bastos'];

const RANKS: [string, string, string][] = [
  ['As','A','semilla, oportunidad nueva'],['Dos','2','elección, encuentro'],['Tres','3','crecimiento, colaboración'],
  ['Cuatro','4','estabilidad, pausa'],['Cinco','5','tensión, pérdida'],['Seis','6','armonía, intercambio'],
  ['Siete','7','prueba, estrategia'],['Ocho','8','movimiento, oficio'],['Nueve','9','casi culminación'],
  ['Diez','10','cierre de ciclo, plenitud'],['Paje','P','mensaje, curiosidad'],['Caballero','C','impulso, búsqueda'],
  ['Reina','Q','madurez interior, cuidado'],['Rey','K','dominio, liderazgo'],
];

export const CARDS: Record<string, CardDef> = {};
MAJ.forEach((m, i) => { CARDS['maj-' + i] = { id: 'maj-' + i, name: m[0], suit: 'mayor', num: i, kw: m[1], msg: m[2], label: ROMAN[i] }; });
(Object.keys(SUITS) as (keyof typeof SUITS)[]).forEach(s => RANKS.forEach((r, i) => {
  CARDS[`${s}-${i + 1}`] = { id: `${s}-${i + 1}`, name: `${r[0]} de ${SUITS[s].n}`, suit: s, num: i + 1, kw: r[2], msg: `${cap(r[2])} en el terreno de ${SUITS[s].area}.`, label: r[1] };
}));
export const CARD_LIST = Object.values(CARDS);

export function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
export const cardImg = (id: string) => `${import.meta.env.BASE_URL}cards/${id}.webp`;

export const POSITIONS = ['Amor', 'Trabajo', 'Personal', 'Familia', 'Sombra', 'Síntesis'];

export interface Reading {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  cards: DrawnCard[];
  positions?: string[] | null;
  tags: string[];
  note: string;
  updated_at?: string;
}
export const posOf = (r: Pick<Reading, 'positions'> | null | undefined, i: number) => (r?.positions || POSITIONS)[i] || POSITIONS[i];
export const validCards = (r: Reading) => (r.cards || []).filter(x => x && CARDS[x.c]);

/** Una frase corta que resume la energía de una tirada según sus palos. */
export function energyLine(r: Reading): string {
  const cs = validCards(r).map(x => CARDS[x.c]);
  if (!cs.length) return '';
  const count: Record<string, number> = {};
  cs.forEach(c => { count[c.suit] = (count[c.suit] || 0) + 1; });
  const top = Object.entries(count).sort((a, b) => b[1] - a[1]);
  const W: Record<Suit, string> = { mayor: 'lecciones grandes', copas: 'corazón abierto', pentaculos: 'pies en la tierra', espadas: 'cabeza activa', bastos: 'fuego creativo' };
  if (top.length === 1) return `Todo habla de ${W[top[0][0] as Suit]}.`;
  return `${cap(W[top[0][0] as Suit])} y ${W[top[1][0] as Suit]}.`;
}

export function dominantSuit(r: Reading | null): Suit | null {
  if (!r) return null;
  const count: Partial<Record<Suit, number>> = {};
  validCards(r).forEach(x => { const s = CARDS[x.c].suit; count[s] = (count[s] || 0) + 1; });
  const e = Object.entries(count).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
  return e ? (e[0] as Suit) : null;
}
