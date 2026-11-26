import * as Astronomy from 'astronomy-engine';
import { SIGNS } from './astro';
import type { Placement } from './types';

export interface Birth { date: string; time: string | null; place: string; lat: number; lon: number; tz: string }
export interface Place { name: string; label: string; lat: number; lon: number; tz: string }
export interface ChartBody { name: string; lon: number; sign: string; deg: number; house: number | null; rx: boolean }
export interface Chart { bodies: ChartBody[]; cusps: number[] | null; asc: number | null; mc: number | null }

const rad = Math.PI / 180, deg = 180 / Math.PI;
const norm = (x: number) => ((x % 360) + 360) % 360;

/** Busca ciudades (Open-Meteo, gratis y sin clave). */
export async function searchPlaces(q: string): Promise<Place[]> {
  if (q.trim().length < 2) return [];
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=es&format=json`);
  if (!r.ok) throw new Error('geocoding');
  const j = await r.json();
  return (j.results || []).map((p: { name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone: string }) => ({
    name: p.name, label: [p.name, p.admin1, p.country].filter(Boolean).join(', '), lat: p.latitude, lon: p.longitude, tz: p.timezone,
  }));
}

/** Minutos de diferencia entre la hora local de `tz` y UTC en el instante dado. */
function tzOffsetMin(tz: string, utcMs: number): number {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(new Date(utcMs)).map(x => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUtc - utcMs) / 60000);
}
export function localToUtc(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split('-').map(Number), [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let utc = guess - tzOffsetMin(tz, guess) * 60000;
  utc = guess - tzOffsetMin(tz, utc) * 60000;
  return new Date(utc);
}

const BODIES: [string, Astronomy.Body][] = [
  ['Sol', Astronomy.Body.Sun], ['Luna', Astronomy.Body.Moon], ['Mercurio', Astronomy.Body.Mercury], ['Venus', Astronomy.Body.Venus], ['Marte', Astronomy.Body.Mars],
  ['Júpiter', Astronomy.Body.Jupiter], ['Saturno', Astronomy.Body.Saturn], ['Urano', Astronomy.Body.Uranus], ['Neptuno', Astronomy.Body.Neptune], ['Plutón', Astronomy.Body.Pluto],
];
function eclLon(b: Astronomy.Body, t: Date) {
  if (b === Astronomy.Body.Sun) return Astronomy.SunPosition(t).elon;
  if (b === Astronomy.Body.Moon) return Astronomy.EclipticGeoMoon(t).lon;
  return Astronomy.Ecliptic(Astronomy.GeoVector(b, t, true)).elon;
}

/** Oblicuidad media de la eclíptica (grados). */
function obliquity(t: Date) { const T = (t.getTime() / 864e5 + 2440587.5 - 2451545) / 36525; return 23.439291 - 0.0130042 * T; }

/** Ecliptic longitude of the point on the ecliptic with right ascension `ra` (deg). */
const raToLon = (ra: number, eps: number) => norm(Math.atan2(Math.sin(ra * rad), Math.cos(ra * rad) * Math.cos(eps * rad)) * deg);

/** Ascendente, Medio Cielo y cúspides Placidus (Porfirio cerca de los polos). */
export function houses(t: Date, lat: number, lon: number) {
  const eps = obliquity(t);
  const ramc = norm(Astronomy.SiderealTime(t) * 15 + lon);
  const mc = raToLon(ramc, eps);
  const asc = norm(Math.atan2(Math.cos(ramc * rad), -(Math.sin(ramc * rad) * Math.cos(eps * rad) + Math.tan(lat * rad) * Math.sin(eps * rad))) * deg);
  const cusps = new Array<number>(12);
  cusps[0] = asc; cusps[9] = mc;
  if (Math.abs(lat) < 66) {
    // Placidus: cada cúspide divide en tercios el semiarco de su propio grado.
    const cusp = (f: number, nocturnal: boolean) => {
      let l = norm(mc + (nocturnal ? 90 + f * 90 : f * 90));
      for (let i = 0; i < 30; i++) {
        const dec = Math.asin(Math.sin(eps * rad) * Math.sin(l * rad));
        const x = -Math.tan(lat * rad) * Math.tan(dec);
        const sda = Math.acos(Math.max(-1, Math.min(1, x))) * deg;
        const ra = nocturnal ? ramc + sda + f * (180 - sda) : ramc + f * sda;
        const nl = raToLon(norm(ra), eps);
        if (Math.abs(nl - l) < 1e-6) { l = nl; break; }
        l = nl;
      }
      return l;
    };
    cusps[10] = cusp(1 / 3, false); cusps[11] = cusp(2 / 3, false);
    cusps[1] = cusp(1 / 3, true); cusps[2] = cusp(2 / 3, true);
  } else {
    const q1 = norm(asc - mc), q2 = norm(mc + 180 - asc);
    cusps[10] = norm(mc + q1 / 3); cusps[11] = norm(mc + (2 * q1) / 3);
    cusps[1] = norm(asc + q2 / 3); cusps[2] = norm(asc + (2 * q2) / 3);
  }
  cusps[3] = norm(cusps[9] + 180); cusps[4] = norm(cusps[10] + 180); cusps[5] = norm(cusps[11] + 180);
  cusps[6] = norm(cusps[0] + 180); cusps[7] = norm(cusps[1] + 180); cusps[8] = norm(cusps[2] + 180);
  return { asc, mc, cusps };
}

export function houseOf(l: number, cusps: number[]) {
  for (let i = 0; i < 12; i++) {
    const a = cusps[i], b = cusps[(i + 1) % 12], span = norm(b - a);
    if (norm(l - a) < span) return i + 1;
  }
  return 1;
}

export function computeChart(b: Birth): Chart {
  const known = !!b.time;
  const t = localToUtc(b.date, b.time || '12:00', b.tz);
  const t2 = new Date(+t + 864e5);
  const h = known ? houses(t, b.lat, b.lon) : null;
  const bodies: ChartBody[] = BODIES.map(([name, body]) => {
    const l = norm(eclLon(body, t));
    let dl = eclLon(body, t2) - l; if (dl > 180) dl -= 360; if (dl < -180) dl += 360;
    return { name, lon: l, sign: SIGNS[Math.floor(l / 30)], deg: l % 30, house: h ? houseOf(l, h.cusps) : null, rx: dl < 0 && name !== 'Sol' && name !== 'Luna' };
  });
  if (h) bodies.unshift({ name: 'Ascendente', lon: h.asc, sign: SIGNS[Math.floor(h.asc / 30)], deg: h.asc % 30, house: 1, rx: false });
  return { bodies, cusps: h?.cusps || null, asc: h?.asc ?? null, mc: h?.mc ?? null };
}

export const chartToPlacements = (c: Chart): Placement[] => c.bodies.map(b => [b.name, b.sign, b.house ?? '', Math.round(b.lon * 100) / 100]);

/** Reconstruye una carta mostrable a partir de lo guardado (con o sin datos de nacimiento). */
export function chartFrom(natal: Placement[] | null, birth?: Birth | null): Chart | null {
  if (birth?.date && Number.isFinite(birth.lat)) { try { return computeChart(birth); } catch { /* sigue */ } }
  if (!natal?.length) return null;
  const bodies = natal.map(p => { const si = SIGNS.indexOf(p[1]); const l = typeof p[3] === 'number' ? p[3] : si * 30 + 15; return { name: p[0], lon: l, sign: p[1], deg: l % 30, house: p[2] ? +p[2] : null, rx: false }; });
  const ascB = bodies.find(b => b.name === 'Ascendente');
  return { bodies, cusps: null, asc: ascB ? Math.floor(ascB.lon / 30) * 30 : null, mc: null };
}
