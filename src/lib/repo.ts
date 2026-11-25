import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
import type { Reading } from './tarot';
import type { Circle, Profile } from './types';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } }) : null;
export const isLive = !!supabase;

export interface Snapshot { me: Profile | null; members: Profile[]; readings: Reading[]; circle: Circle | null; context: string }

export interface Repo {
  mode: 'demo' | 'live';
  load(): Promise<Snapshot>;
  saveReading(r: Omit<Reading, 'id' | 'user_id'> & { id?: string }): Promise<void>;
  deleteReading(id: string): Promise<void>;
  saveProfile(p: Partial<Profile>): Promise<void>;
  saveContext(text: string): Promise<void>;
  subscribe(onChange: () => void): () => void;
}

/* ---------------- Supabase ---------------- */
export const auth = {
  async session(): Promise<Session | null> { return supabase ? (await supabase.auth.getSession()).data.session : null; },
  onChange(cb: (s: Session | null) => void) { if (!supabase) return () => {}; const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(s)); return () => data.subscription.unsubscribe(); },
  async sendLink(email: string) {
    const redirect = window.location.origin + window.location.pathname;
    const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
    if (error) throw error;
  },
  async verifyCode(email: string, token: string) { const { error } = await supabase!.auth.verifyOtp({ email, token, type: 'email' }); if (error) throw error; },
  async signOut() { await supabase?.auth.signOut(); },
  async createProfile(p: { handle: string; display_name: string; accent: string }) {
    const s = await auth.session(); if (!s) throw new Error('Sin sesión');
    const { error } = await supabase!.from('profiles').insert({ id: s.user.id, ...p }); if (error) throw error;
  },
  async createCircle(name: string) { const { error } = await supabase!.rpc('create_circle', { circle_name: name }); if (error) throw error; },
  async joinCircle(code: string) { const { error } = await supabase!.rpc('join_circle', { code }); if (error) throw error; },
};

export const liveRepo: Repo = {
  mode: 'live',
  async load() {
    const sb = supabase!, s = await auth.session();
    if (!s) return { me: null, members: [], readings: [], circle: null, context: '' };
    const [{ data: profiles, error: e1 }, { data: readings, error: e2 }, { data: note }, { data: circles }] = await Promise.all([
      sb.from('profiles').select('*'),
      sb.from('readings').select('*').order('date', { ascending: false }).limit(2000),
      sb.from('private_notes').select('context').eq('user_id', s.user.id).maybeSingle(),
      sb.from('circles').select('*').limit(1),
    ]);
    if (e1) throw e1; if (e2) throw e2;
    const members = (profiles || []) as Profile[];
    return { me: members.find(m => m.id === s.user.id) || null, members, readings: (readings || []) as Reading[], circle: (circles?.[0] as Circle) || null, context: note?.context || '' };
  },
  async saveReading(r) {
    const s = await auth.session(); if (!s) throw new Error('Sin sesión');
    const row = { date: r.date, cards: r.cards, positions: r.positions ?? null, tags: r.tags, note: r.note, user_id: s.user.id };
    const q = r.id ? supabase!.from('readings').update(row).eq('id', r.id) : supabase!.from('readings').insert(row);
    const { error } = await q; if (error) throw error;
  },
  async deleteReading(id) { const { error } = await supabase!.from('readings').delete().eq('id', id); if (error) throw error; },
  async saveProfile(p) {
    const s = await auth.session(); if (!s) throw new Error('Sin sesión');
    const { id: _i, circle_id: _c, ...rest } = p;
    const { error } = await supabase!.from('profiles').update(rest).eq('id', s.user.id); if (error) throw error;
  },
  async saveContext(text) {
    const s = await auth.session(); if (!s) throw new Error('Sin sesión');
    const { error } = await supabase!.from('private_notes').upsert({ user_id: s.user.id, context: text, updated_at: new Date().toISOString() }); if (error) throw error;
  },
  subscribe(onChange) {
    const ch = supabase!.channel('readings').on('postgres_changes', { event: '*', schema: 'public', table: 'readings' }, () => onChange()).subscribe();
    return () => { supabase!.removeChannel(ch); };
  },
};

/* ---------------- Modo demo (sin base de datos, guarda en este navegador) ---------------- */
const LS = 'taro-demo-v1';
const today = new Date();
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ago = (n: number) => iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));

function seed(): Snapshot {
  const v: Profile = { id: 'demo-valentino', handle: 'valentino', display_name: 'Valentino', accent: '#B58CE7', tags: ['Energía general', 'Diego', 'Personal', 'Trabajo', 'Familia'], natal: [['Ascendente', 'Libra', 1], ['Sol', 'Géminis', 9], ['Luna', 'Piscis', 6], ['Venus', 'Cáncer', 10], ['Marte', 'Leo', 11], ['Mercurio', 'Tauro', 8], ['Júpiter', 'Sagitario', 3], ['Saturno', 'Capricornio', 4]], meta: { love: 'Diego', studio: 'tu estudio' }, circle_id: 'demo' };
  const d: Profile = { id: 'demo-diego', handle: 'diego', display_name: 'Diego', accent: '#69CDA6', tags: ['Energía general', 'Valentino', 'Personal', 'Trabajo', 'Familia'], natal: null, meta: { love: 'Valentino' }, circle_id: 'demo' };
  const R = (id: string, user: string, date: string, cards: [string, boolean?][], tags: string[], note: string): Reading => ({ id, user_id: user, date, cards: cards.map(([c, r]) => ({ c, r: !!r })), tags, note });
  return {
    me: v, members: [v, d], circle: { id: 'demo', name: 'Valentino y Diego', invite_code: 'DEMO1234' }, context: '',
    readings: [
      R('r1', v.id, ago(0), [['copas-1'], ['maj-18'], ['bastos-14']], ['Energía general'], 'Amor — el corazón está abierto y con ganas de dar.\n\nTrabajo — todavía hay niebla: no decidir hasta que aclare.\n\nPersonal — tomar el mando desde mi propio fuego.'),
      R('r2', v.id, ago(1), [['maj-17'], ['copas-11'], ['pentaculos-13']], ['Personal'], 'Una calma nueva después de semanas movidas.'),
      R('r3', v.id, ago(4), [['espadas-3'], ['maj-6'], ['bastos-8']], ['Diego', 'Trabajo'], 'Ejemplo de tirada en modo demo.'),
      R('r4', d.id, ago(0), [['maj-19'], ['pentaculos-8'], ['copas-2']], ['Valentino'], 'Ejemplo de tirada de Diego.'),
      R('r5', d.id, ago(2), [['espadas-1'], ['maj-10'], ['copas-9']], ['Energía general'], ''),
    ],
  };
}
function read(): Snapshot { try { const s = localStorage.getItem(LS); if (s) return JSON.parse(s); } catch { /* ignore */ } const s = seed(); write(s); return s; }
function write(s: Snapshot) { try { localStorage.setItem(LS, JSON.stringify(s)); } catch { /* ignore */ } }
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(f => f());

export const demoRepo: Repo = {
  mode: 'demo',
  async load() { return read(); },
  async saveReading(r) {
    const s = read();
    if (r.id) s.readings = s.readings.map(x => x.id === r.id ? { ...x, ...r, id: x.id } as Reading : x);
    else s.readings.unshift({ ...r, id: 'r' + Date.now().toString(36), user_id: s.me!.id } as Reading);
    write(s); emit();
  },
  async deleteReading(id) { const s = read(); s.readings = s.readings.filter(x => x.id !== id); write(s); emit(); },
  async saveProfile(p) { const s = read(); s.members = s.members.map(m => m.id === s.me!.id ? { ...m, ...p, id: m.id } : m); s.me = s.members.find(m => m.id === s.me!.id)!; write(s); emit(); },
  async saveContext(text) { const s = read(); s.context = text; write(s); emit(); },
  subscribe(f) { listeners.add(f); return () => { listeners.delete(f); }; },
};
/** Solo en demo: cambiar "quién soy" para probar la vista de Diego. */
export function demoActAs(id: string) { const s = read(); const m = s.members.find(x => x.id === id); if (m) { s.me = m; write(s); emit(); } }

export const repo: Repo = isLive ? liveRepo : demoRepo;
