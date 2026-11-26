import type { Suit } from './tarot';

export interface Rec { kind: 'song' | 'book' | 'movie'; title: string; by: string; url: string }
export interface DailyRecs { reason: string; items: Rec[] }

const q = encodeURIComponent;
const song = (title: string, by: string): Rec => ({ kind: 'song', title, by, url: `https://open.spotify.com/search/${q(`${title} ${by}`)}` });
const book = (title: string, by: string): Rec => ({ kind: 'book', title, by, url: `https://www.goodreads.com/search?q=${q(`${title} ${by}`)}` });
const movie = (title: string, by: string): Rec => ({ kind: 'movie', title, by, url: `https://www.justwatch.com/co/buscar?q=${q(title)}` });

/** Catálogo curado por energía del palo dominante. */
const CATALOG: Record<Suit, { reason: string; songs: Rec[]; books: Rec[]; movies: Rec[] }> = {
  copas: {
    reason: 'Hoy domina el Agua: algo para sentir sin prisa.',
    songs: [song('Ojalá', 'Silvio Rodríguez'), song('Amor completo', 'Mon Laferte'), song('Moon River', 'Henry Mancini')],
    books: [book('El amor en los tiempos del cólera', 'Gabriel García Márquez'), book('Cartas a un joven poeta', 'Rainer Maria Rilke'), book('Todo sobre el amor', 'bell hooks')],
    movies: [movie('Con ánimo de amar (In the Mood for Love)', 'Wong Kar-wai, 2000'), movie('Llámame por tu nombre', 'Luca Guadagnino, 2017'), movie('Amélie', 'Jean-Pierre Jeunet, 2001')],
  },
  pentaculos: {
    reason: 'Hoy domina la Tierra: algo que te aterrice y te devuelva al cuerpo.',
    songs: [song('Here Comes the Sun', 'The Beatles'), song('Gracias a la vida', 'Violeta Parra'), song('Latinoamérica', 'Calle 13')],
    books: [book('Hábitos atómicos', 'James Clear'), book('Trabajo profundo', 'Cal Newport'), book('El arte de la quietud', 'Pico Iyer')],
    movies: [movie('Perfect Days', 'Wim Wenders, 2023'), movie('Chef', 'Jon Favreau, 2014'), movie('El festín de Babette', 'Gabriel Axel, 1987')],
  },
  espadas: {
    reason: 'Hoy domina el Aire: algo para pensar claro y mirar distinto.',
    songs: [song('Clocks', 'Coldplay'), song('Hallelujah', 'Leonard Cohen'), song('Lamento boliviano', 'Enanitos Verdes')],
    books: [book('El hombre en busca de sentido', 'Viktor Frankl'), book('Meditaciones', 'Marco Aurelio'), book('Pensar rápido, pensar despacio', 'Daniel Kahneman')],
    movies: [movie('Eterno resplandor de una mente sin recuerdos', 'Michel Gondry, 2004'), movie('La llegada', 'Denis Villeneuve, 2016'), movie('Her', 'Spike Jonze, 2013')],
  },
  bastos: {
    reason: 'Hoy domina el Fuego: algo que te prenda las ganas de crear.',
    songs: [song("Don't Stop Me Now", 'Queen'), song('La bicicleta', 'Carlos Vives y Shakira'), song('Running Up That Hill', 'Kate Bush')],
    books: [book('El camino del artista', 'Julia Cameron'), book('Libera tu magia', 'Elizabeth Gilbert'), book('Roba como un artista', 'Austin Kleon')],
    movies: [movie('Frida', 'Julie Taymor, 2002'), movie('Whiplash', 'Damien Chazelle, 2014'), movie('La La Land', 'Damien Chazelle, 2016')],
  },
  mayor: {
    reason: 'Hoy mandan los Arcanos Mayores: algo grande, para mirar tu propio camino.',
    songs: [song('Alfonsina y el mar', 'Mercedes Sosa'), song('Cosmic Love', 'Florence + The Machine'), song('Bohemian Rhapsody', 'Queen')],
    books: [book('El alquimista', 'Paulo Coelho'), book('Cien años de soledad', 'Gabriel García Márquez'), book('El poder del ahora', 'Eckhart Tolle')],
    movies: [movie('El viaje de Chihiro', 'Hayao Miyazaki, 2001'), movie('Todo en todas partes al mismo tiempo', 'Daniels, 2022'), movie('Una aventura extraordinaria (Life of Pi)', 'Ang Lee, 2012')],
  },
};

const ORDER: Suit[] = ['mayor', 'copas', 'pentaculos', 'espadas', 'bastos'];

/** Recomendación del día: según el palo de tu tirada de hoy, o según el día si aún no hay tirada. */
export function dailyRecs(date: string, suit: Suit | null, userSeed = ''): DailyRecs {
  const n = [...(date + userSeed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const s = suit || ORDER[n % ORDER.length];
  const c = CATALOG[s];
  return {
    reason: suit ? c.reason : 'Aún no haces tu tirada: esta es la energía del día.',
    items: [c.songs[n % 3], c.books[(n >> 3) % 3], c.movies[(n >> 6) % 3]],
  };
}
