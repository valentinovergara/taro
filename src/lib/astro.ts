import * as Astronomy from 'astronomy-engine';
import { SUITS, type CardDef } from './tarot';
import type { Placement } from './types';

export const SIGNS = ['Aries','Tauro','Géminis','Cáncer','Leo','Virgo','Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis'];
export const SIGN_GLYPH = ['♈︎','♉︎','♊︎','♋︎','♌︎','♍︎','♎︎','♏︎','♐︎','♑︎','♒︎','♓︎'];
export const ELEM: Record<string, string> = { Aries:'Fuego',Leo:'Fuego',Sagitario:'Fuego',Tauro:'Tierra',Virgo:'Tierra',Capricornio:'Tierra',Géminis:'Aire',Libra:'Aire',Acuario:'Aire',Cáncer:'Agua',Escorpio:'Agua',Piscis:'Agua' };
export const PLANETS = ['Ascendente','Sol','Luna','Mercurio','Venus','Marte','Júpiter','Saturno','Urano','Neptuno','Plutón'];
export const PLANET_GLYPH: Record<string, string> = { Ascendente:'AC',Sol:'☉',Luna:'☽',Mercurio:'☿',Venus:'♀',Marte:'♂',Júpiter:'♃',Saturno:'♄',Urano:'♅',Neptuno:'♆',Plutón:'♇' };
export const TRAIT: Record<string, string> = { Aries:'impulso, franqueza y ganas de empezar',Tauro:'calma, constancia y placer de los sentidos',Géminis:'curiosidad, palabra y juego',Cáncer:'ternura, memoria y necesidad de refugio',Leo:'calidez, orgullo y ganas de brillar',Virgo:'detalle, servicio y orden',Libra:'armonía, belleza y acuerdo',Escorpio:'intensidad, profundidad y lealtad',Sagitario:'aventura, sentido y libertad',Capricornio:'ambición, estructura y paciencia',Acuario:'independencia, ideas y amistad',Piscis:'sensibilidad, imaginación y compasión' };
export const PMEAN: Record<string, string> = { Ascendente:'cómo te muestras al mundo',Sol:'tu identidad y propósito',Luna:'tu necesidad emocional',Mercurio:'tu forma de pensar y decir',Venus:'tu forma de amar',Marte:'tu deseo y cómo defiendes lo tuyo',Júpiter:'tu fe y tu creatividad',Saturno:'tus compromisos y límites',Urano:'tu necesidad de libertad',Neptuno:'tus sueños',Plutón:'tus transformaciones profundas' };
export const AREA_NATAL: Record<string, string[]> = { Amor:['Venus','Luna','Saturno','Marte'],Trabajo:['Sol','Saturno','Urano','Mercurio','Marte'],Personal:['Ascendente','Sol','Luna','Júpiter'],Familia:['Plutón','Luna'],Sombra:['Marte','Júpiter','Plutón'],Síntesis:['Sol','Luna','Ascendente'] };
const TB: [string, Astronomy.Body, number, string][] = [
  ['Sol',Astronomy.Body.Sun,2,'foco y vitalidad'],['Luna',Astronomy.Body.Moon,1,'el ánimo del día'],['Mercurio',Astronomy.Body.Mercury,2,'conversaciones y mensajes'],
  ['Venus',Astronomy.Body.Venus,2,'afecto, placer y valor propio'],['Marte',Astronomy.Body.Mars,3,'impulso y roces'],['Júpiter',Astronomy.Body.Jupiter,4,'expansión y buena suerte'],
  ['Saturno',Astronomy.Body.Saturn,5,'límites, compromiso y madurez'],['Urano',Astronomy.Body.Uranus,5,'sorpresas y ganas de libertad'],['Neptuno',Astronomy.Body.Neptune,5,'sueños, niebla e inspiración'],['Plutón',Astronomy.Body.Pluto,5,'transformación profunda'],
];
const ASP: Record<number, [string, number, string]> = { 0:['conjunción',3,'activa'],2:['sextil',1,'abre una oportunidad en'],3:['cuadratura',3,'tensiona'],4:['trígono',2,'fluye a favor de'],6:['oposición',3,'pide equilibrio en'] };
const MAJ_ASTRO = ['Urano','Mercurio','Luna','Venus','Aries','Tauro','Géminis','Cáncer','Leo','Virgo','Júpiter','Libra','Neptuno','Escorpio','Sagitario','Capricornio','Marte','Acuario','Piscis','Sol','Plutón','Saturno'];
const SUIT_EL: Record<string, string> = { copas:'Agua',pentaculos:'Tierra',espadas:'Aire',bastos:'Fuego' };

export interface Aspect { np: string; ns: string; name: string; verb: string; score: number }
export interface SkyBody { n: string; sign: string; si: number; deg: number; rx: boolean; fl: string; asp: Aspect[] }

const natalP = (N: Placement[], p: string) => N.find(n => n[0] === p);

function lonOf(b: Astronomy.Body, t: Date) {
  if (b === Astronomy.Body.Sun) return Astronomy.SunPosition(t).elon;
  if (b === Astronomy.Body.Moon) return Astronomy.EclipticGeoMoon(t).lon;
  return Astronomy.Ecliptic(Astronomy.GeoVector(b, t, true)).elon;
}

const cache = new Map<string, Omit<SkyBody, 'asp' | 'sign'>[]>();
export function sky(date: string, N: Placement[]): SkyBody[] | null {
  try {
    if (!cache.has(date)) {
      const [y, m, d] = date.split('-').map(Number), t = new Date(y, m - 1, d, 12), t2 = new Date(+t + 864e5);
      cache.set(date, TB.map(([n, b, , fl]) => {
        let l = lonOf(b, t), dl = lonOf(b, t2) - l;
        if (dl > 180) dl -= 360; if (dl < -180) dl += 360;
        l = ((l % 360) + 360) % 360;
        return { n, si: Math.floor(l / 30), deg: Math.floor(l % 30), rx: dl < 0 && n !== 'Sol' && n !== 'Luna', fl };
      }));
    }
    return cache.get(date)!.map((p, k) => ({
      ...p, sign: SIGNS[p.si],
      asp: N.map(([np, ns]) => {
        const kk = (p.si - SIGNS.indexOf(ns) + 12) % 12, a = ASP[Math.min(kk, 12 - kk)];
        return a ? { np, ns, name: a[0], verb: a[2], score: a[1] * TB[k][2] } : null;
      }).filter(Boolean) as Aspect[],
    }));
  } catch { return null; }
}
export const skyLine = (date: string) => (sky(date, []) || []).map(p => `${p.n} en ${p.sign}${p.rx ? ' ℞' : ''}`).join(', ');

export function resonance(c: CardDef, N: Placement[]): string {
  if (c.suit === 'mayor') {
    const at = MAJ_ASTRO[c.num], np = natalP(N, at);
    if (np) return `${c.name} se asocia con ${at}: habla de tu ${at} en ${np[1]}, ${PMEAN[at]}.`;
    const hits = N.filter(n => n[1] === at);
    if (hits.length) return `${c.name} se asocia con ${at}, el signo de tu ${hits.map(h => h[0]).join(' y ')}: toca ${PMEAN[hits[0][0]]}.`;
    return N.length ? `${c.name} se asocia con ${at}, un signo vacío en tu carta: trae una energía nueva.` : `${c.name} se asocia con ${at}.`;
  }
  const el = SUIT_EL[c.suit], hits = N.filter(n => ELEM[n[1]] === el), s = SUITS[c.suit as keyof typeof SUITS];
  if (!N.length) return `${s.n} es ${el}.`;
  return hits.length ? `${s.n} es ${el}, como tu ${hits.map(h => `${h[0]} en ${h[1]}`).join(', ')}.` : `${s.n} es ${el}, un elemento que casi no está en tu carta: te invita a aprenderlo con paciencia.`;
}

export function transitFor(area: string, s: SkyBody[] | null, N: Placement[]): string {
  if (!s || !N.length) return '';
  const want = AREA_NATAL[area] || ['Sol', 'Luna', 'Ascendente'];
  const best = s.flatMap(p => p.asp.filter(a => want.includes(a.np)).map(a => ({ p, a }))).sort((u, v) => v.a.score - u.a.score)[0];
  if (!best) return '';
  return `${best.p.n} en ${best.p.sign}${best.p.rx ? ' (retrógrado)' : ''} hace ${best.a.name} a tu ${best.a.np} en ${best.a.ns}: ${best.p.fl} ${best.a.verb} ${PMEAN[best.a.np]}.`;
}

const TIP_LOVE: Record<string, string> = { Fuego:'Propón planes y celebra en voz alta.',Tierra:'Demuestra con hechos y tiempo de calidad.',Aire:'Habla, escribe, comparte ideas: la palabra une.',Agua:'Cuida la intimidad y nombra lo que sientes.' };
const TIP_WORK: Record<string, string> = { Fuego:'Trabaja por impulsos creativos y date metas visibles.',Tierra:'Avanza con método y celebra lo que ya construiste.',Aire:'Rodéate de ideas e intercambio; aprende enseñando.',Agua:'Trabaja en lo que te conmueve y cuida tu energía.' };

export interface NatalAdvice { area: string; basis: string; text: string; tip: string }
export function natalAdvice(N: Placement[]): NatalAdvice[] {
  const g = (p: string) => natalP(N, p), out: NatalAdvice[] = [];
  const ph = (p: string, f: (s: string) => string) => { const x = g(p); return x ? f(x[1]) : ''; };
  const lbl = (p: string) => { const x = g(p); return x ? `${p === 'Ascendente' ? 'Ascendente' : p + ' en'} ${x[1]}${x[2] && p !== 'Ascendente' ? ` (Casa ${x[2]})` : ''}` : ''; };
  const ven = g('Venus'), sol = g('Sol');
  out.push({ area: 'Amor', basis: ['Venus', 'Luna', 'Saturno'].map(lbl).filter(Boolean).join(' · '),
    text: [ph('Venus', s => `Con Venus en ${s} amas desde ${TRAIT[s]}.`), ph('Luna', s => `Tu Luna en ${s} necesita ${TRAIT[s]} para sentirse segura.`), ph('Saturno', s => `Saturno en ${s} pide compromisos con ${TRAIT[s].split(', ')[0]}.`)].filter(Boolean).join(' '),
    tip: ven ? TIP_LOVE[ELEM[ven[1]]] : '' });
  out.push({ area: 'Trabajo', basis: ['Sol', 'Mercurio', 'Marte'].map(lbl).filter(Boolean).join(' · '),
    text: [ph('Sol', s => `Tu Sol en ${s} brilla con ${TRAIT[s]}.`), ph('Mercurio', s => `Mercurio en ${s} piensa con ${TRAIT[s]}.`), ph('Marte', s => `Marte en ${s} te mueve desde ${TRAIT[s].split(', ')[0]}.`)].filter(Boolean).join(' '),
    tip: sol ? TIP_WORK[ELEM[sol[1]]] : '' });
  out.push({ area: 'Personal', basis: ['Ascendente', 'Júpiter'].map(lbl).filter(Boolean).join(' · '),
    text: [ph('Ascendente', s => `Llegas al mundo con ${TRAIT[s]}.`), ph('Júpiter', s => `Júpiter en ${s} te expande cuando confías en ${TRAIT[s].split(', ')[0]}.`)].filter(Boolean).join(' '),
    tip: 'Lo que te recarga es lo que haces cuando nadie mira: cuídalo.' });
  const h4 = N.filter(n => +n[2] === 4);
  out.push({ area: 'Familia y casa', basis: h4.length ? h4.map(n => `${n[0]} en ${n[1]} (Casa 4)`).join(' · ') : lbl('Luna'),
    text: h4.length ? `${h4.map(n => n[0]).join(' y ')} en tu Casa 4: raíces marcadas por ${TRAIT[h4[0][1]]}.` : ph('Luna', s => `Tu Luna en ${s} hace de casa un lugar de ${TRAIT[s]}.`),
    tip: 'Tu espacio es medicina: cuando lo cuidas, te regulas.' });
  return out.filter(a => a.text);
}

/* ─── Luna, eclipses y lenguaje sencillo ───────────────── */
const localIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export type MoonEvent = { kind: 'nueva' | 'creciente' | 'llena' | 'menguante' | 'eclipse-solar' | 'eclipse-lunar'; label: string; icon: string };
const QUARTER: MoonEvent[] = [
  { kind: 'nueva', label: 'Luna nueva', icon: '🌑' }, { kind: 'creciente', label: 'Cuarto creciente', icon: '🌓' },
  { kind: 'llena', label: 'Luna llena', icon: '🌕' }, { kind: 'menguante', label: 'Cuarto menguante', icon: '🌗' },
];
export const MOON_TIP: Record<MoonEvent['kind'], string> = {
  nueva: 'Buen momento para sembrar una intención: empieza algo pequeño y nómbralo.',
  creciente: 'La energía sube. Es momento de actuar y sostener lo que empezaste.',
  llena: 'Todo se ilumina: emociones a flor de piel, cierres y revelaciones. Suelta lo que ya cumplió su ciclo.',
  menguante: 'Toca soltar, ordenar y descansar antes del próximo comienzo.',
  'eclipse-solar': 'Un eclipse de Sol: un portal de comienzos inesperados. Mejor observar que forzar.',
  'eclipse-lunar': 'Un eclipse de Luna: algo emocional sale a la luz para cerrarse. Sé suave contigo.',
};
const moonCache = new Map<string, Map<string, MoonEvent[]>>();
/** Fases principales de la Luna y eclipses de un mes, por fecha local. */
export function moonEvents(y: number, m: number): Map<string, MoonEvent[]> {
  const key = `${y}-${m}`;
  if (moonCache.has(key)) return moonCache.get(key)!;
  const out = new Map<string, MoonEvent[]>(), start = new Date(y, m, 1), end = new Date(y, m + 1, 1);
  const add = (d: Date, e: MoonEvent) => { if (d >= start && d < end) { const k = localIso(d); out.set(k, [...(out.get(k) || []), e]); } };
  try {
    let q = Astronomy.SearchMoonQuarter(new Date(+start - 864e5));
    while (q.time.date < end) { add(q.time.date, QUARTER[q.quarter]); q = Astronomy.NextMoonQuarter(q); }
    let le = Astronomy.SearchLunarEclipse(new Date(+start - 864e5));
    while (le.peak.date < end) { if (le.kind !== Astronomy.EclipseKind.Penumbral) add(le.peak.date, { kind: 'eclipse-lunar', label: le.kind === Astronomy.EclipseKind.Total ? 'Eclipse total de Luna' : 'Eclipse parcial de Luna', icon: '🔴' }); le = Astronomy.NextLunarEclipse(le.peak); }
    let se = Astronomy.SearchGlobalSolarEclipse(new Date(+start - 864e5));
    while (se.peak.date < end) { add(se.peak.date, { kind: 'eclipse-solar', label: se.kind === Astronomy.EclipseKind.Total ? 'Eclipse total de Sol' : se.kind === Astronomy.EclipseKind.Annular ? 'Eclipse anular de Sol' : 'Eclipse parcial de Sol', icon: '🌒' }); se = Astronomy.NextGlobalSolarEclipse(se.peak); }
  } catch { /* sin datos */ }
  moonCache.set(key, out);
  return out;
}
/** Nombre de la fase lunar de cualquier día. */
export function moonPhaseName(date: string): { name: string; icon: string; tip: string } {
  const [y, m, d] = date.split('-').map(Number), a = Astronomy.MoonPhase(new Date(y, m - 1, d, 12));
  const P: [number, string, string, string][] = [
    [22.5, 'Luna nueva', '🌑', 'Momento de intención y silencio.'], [67.5, 'Luna creciente', '🌒', 'Las ideas toman forma; da el primer paso.'],
    [112.5, 'Cuarto creciente', '🌓', 'Toca actuar y resolver obstáculos.'], [157.5, 'Gibosa creciente', '🌔', 'Ajusta, pule y persevera.'],
    [202.5, 'Luna llena', '🌕', 'Todo se ilumina y las emociones se sienten más.'], [247.5, 'Gibosa menguante', '🌖', 'Agradece y comparte lo aprendido.'],
    [292.5, 'Cuarto menguante', '🌗', 'Suelta lo que ya no te sirve.'], [337.5, 'Luna menguante', '🌘', 'Descansa y prepara el terreno.'], [361, 'Luna nueva', '🌑', 'Momento de intención y silencio.'],
  ];
  const p = P.find(x => a < x[0])!;
  return { name: p[1], icon: p[2], tip: p[3] };
}

const SLOW: Record<string, Astronomy.Body> = { Júpiter: Astronomy.Body.Jupiter, Saturno: Astronomy.Body.Saturn, Urano: Astronomy.Body.Uranus, Neptuno: Astronomy.Body.Neptune, Plutón: Astronomy.Body.Pluto };
export const isSlow = (n: string) => n in SLOW;
const sinceCache = new Map<string, number>();
/** Año en que un planeta lento entró al signo donde está (ignorando idas y vueltas por retrogradación). */
export function signSince(n: string, date: string): number | null {
  const b = SLOW[n]; if (!b) return null;
  const [y, m, d] = date.split('-').map(Number), t0 = new Date(y, m - 1, d, 12), k = `${n}|${y}-${m}`;
  if (sinceCache.has(k)) return sinceCache.get(k)!;
  const si = (t: Date) => Math.floor((((lonOf(b, t) % 360) + 360) % 360) / 30), s0 = si(t0);
  let t = t0, lastIn = t0, outDays = 0;
  for (let i = 0; i < 4000 && outDays < 420; i++) { t = new Date(+t - 10 * 864e5); if (si(t) === s0) { lastIn = t; outDays = 0; } else outDays += 10; }
  const yr = lastIn.getFullYear(); sinceCache.set(k, yr); return yr;
}

const PLAIN: Record<string, (s: string) => string> = {
  Sol: s => `El foco del momento está en ${TRAIT[s]}.`,
  Luna: s => `El ánimo de hoy pide ${TRAIT[s]}.`,
  Mercurio: s => `Las conversaciones y los mensajes llegan con ${TRAIT[s]}.`,
  Venus: s => `En el amor y el placer se busca ${TRAIT[s]}.`,
  Marte: s => `La energía y las ganas se mueven con ${TRAIT[s]}.`,
  Júpiter: s => `La buena suerte crece en lo que tiene que ver con ${TRAIT[s]}.`,
  Saturno: s => `La vida nos pide madurar en ${TRAIT[s]}.`,
  Urano: s => `Las sorpresas y los cambios llegan por el lado de ${TRAIT[s]}.`,
  Neptuno: s => `Los sueños colectivos se tiñen de ${TRAIT[s]}.`,
  Plutón: s => `Una transformación lenta y profunda toca ${TRAIT[s]}.`,
};
const RX: Record<string, string> = { Mercurio: 'Está retrógrado: revisa antes de enviar y ten paciencia con la tecnología.', Venus: 'Está retrógrado: viejos amores y viejos gustos vuelven a tocar la puerta.', Marte: 'Está retrógrado: mejor terminar que empezar peleas o proyectos.' };
/** Una frase sencilla por tránsito. */
export function transitPlain(p: SkyBody): string {
  return `${PLAIN[p.n]?.(p.sign) || ''}${p.rx ? ' ' + (RX[p.n] || 'Va retrógrado: es tiempo de revisar más que de empujar.') : ''}`;
}

/** Lectura general, nada técnica, del cielo de un día. */
export function skySummary(date: string, s: SkyBody[] | null, N: Placement[], name: string): string[] {
  if (!s) return [];
  const g = (n: string) => s.find(p => p.n === n)!;
  const sun = g('Sol'), moon = g('Luna'), ph = moonPhaseName(date);
  const out = [`${ph.icon} ${ph.name} en ${moon.sign}. ${ph.tip} Con el Sol en ${sun.sign}, la temporada trae ${TRAIT[sun.sign]}.`];
  const rx = s.filter(p => p.rx && ['Mercurio', 'Venus', 'Marte'].includes(p.n));
  if (rx.length) out.push(`${rx.map(p => p.n).join(' y ')} ${rx.length > 1 ? 'van' : 'va'} retrógrado${rx.length > 1 ? 's' : ''}: ${rx.length > 1 ? 'buen momento para revisar' : RX[rx[0].n].split(': ')[1]}`);
  if (N.length) {
    const best = s.flatMap(p => p.asp.filter(a => ['Sol', 'Luna', 'Ascendente', 'Venus'].includes(a.np) && a.name !== 'sextil').map(a => ({ p, a }))).sort((u, v) => v.a.score - u.a.score)[0];
    if (best) {
      const feel = best.a.name === 'trígono' ? 'te acompaña' : best.a.name === 'conjunción' ? 'se activa fuerte' : 'te reta un poco';
      out.push(`Para ti, ${name}: ${best.p.n} ${feel} en ${PMEAN[best.a.np]}. ${best.a.name === 'trígono' ? 'Aprovecha la corriente.' : best.a.name === 'conjunción' ? 'Ponle atención, es tema del momento.' : 'No es malo: es una invitación a crecer ahí.'}`);
    }
  }
  return out;
}
