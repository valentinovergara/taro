import * as Astronomy from 'astronomy-engine';
import { SUITS, type CardDef } from './tarot';
import type { Placement } from './types';

export const SIGNS = ['Aries','Tauro','Géminis','Cáncer','Leo','Virgo','Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis'];
export const SIGN_GLYPH = ['♈︎','♉︎','♊︎','♋︎','♌︎','♍︎','♎︎','♏︎','♐︎','♑︎','♒︎','♓︎'];
export const ELEM: Record<string, string> = { Aries:'Fuego',Leo:'Fuego',Sagitario:'Fuego',Tauro:'Tierra',Virgo:'Tierra',Capricornio:'Tierra',Géminis:'Aire',Libra:'Aire',Acuario:'Aire',Cáncer:'Agua',Escorpio:'Agua',Piscis:'Agua' };
export const PLANETS = ['Ascendente','Sol','Luna','Mercurio','Venus','Marte','Júpiter','Saturno','Urano','Neptuno','Plutón'];
export const PLANET_GLYPH: Record<string, string> = { Ascendente:'AC',Sol:'☉',Luna:'☽',Mercurio:'☿',Venus:'♀',Marte:'♂',Júpiter:'♃',Saturno:'♄',Urano:'♅',Neptuno:'♆',Plutón:'♇' };
const TRAIT: Record<string, string> = { Aries:'impulso, franqueza y ganas de empezar',Tauro:'calma, constancia y placer de los sentidos',Géminis:'curiosidad, palabra y juego',Cáncer:'ternura, memoria y necesidad de refugio',Leo:'calidez, orgullo y ganas de brillar',Virgo:'detalle, servicio y orden',Libra:'armonía, belleza y acuerdo',Escorpio:'intensidad, profundidad y lealtad',Sagitario:'aventura, sentido y libertad',Capricornio:'ambición, estructura y paciencia',Acuario:'independencia, ideas y amistad',Piscis:'sensibilidad, imaginación y compasión' };
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
  return hits.length ? `${s.n} es ${el}, como tu ${hits.map(h => `${h[0]} en ${h[1]}`).join(', ')}.` : `${s.n} es ${el}, un elemento que casi no tienes: pide aprenderlo.`;
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
