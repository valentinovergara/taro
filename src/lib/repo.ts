import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
import type { Reading } from './tarot';
import type { Comment, Friendship, Profile, ProfileHit, ProfileMeta, Reaction } from './types';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storage: typeof window !== 'undefined' ? window.localStorage : undefined } }) : null;
export const isLive = !!supabase;

export interface Snapshot {
  me: Profile | null;
  /** Yo y mis amigos (y quien tenga una solicitud conmigo). */
  members: Profile[];
  readings: Reading[];
  friendships: Friendship[];
  comments: Comment[];
  reactions: Reaction[];
  /** Datos privados del perfil propio: nacimiento, personas, patrones. */
  myMeta: ProfileMeta;
  context: string;
}

export type ReadingInput = Omit<Reading, 'id' | 'user_id'> & { id?: string };

export interface Repo {
  mode: 'demo' | 'live';
  load(): Promise<Snapshot>;
  saveReading(r: ReadingInput): Promise<void>;
  deleteReading(id: string): Promise<void>;
  saveProfile(p: Partial<Profile>): Promise<void>;
  saveMyMeta(meta: ProfileMeta): Promise<void>;
  saveContext(text: string): Promise<void>;
  comment(readingId: string, body: string): Promise<void>;
  deleteComment(id: string): Promise<void>;
  toggleReaction(readingId: string, emoji: string, on: boolean): Promise<void>;
  searchProfiles(q: string): Promise<ProfileHit[]>;
  requestFriend(id: string): Promise<string>;
  acceptFriend(friendshipId: string): Promise<void>;
  removeFriend(friendshipId: string): Promise<void>;
  subscribe(onChange: () => void): () => void;
}

/* ---------------- Supabase ---------------- */
export const auth = {
  async session(): Promise<Session | null> { return supabase ? (await supabase.auth.getSession()).data.session : null; },
  onChange(cb: (s: Session | null, event?: string) => void) { if (!supabase) return () => {}; const { data } = supabase.auth.onAuthStateChange((e, s) => cb(s, e)); return () => data.subscription.unsubscribe(); },
  redirect() { return window.location.origin + window.location.pathname; },
  async signIn(email: string, password: string) { const { error } = await supabase!.auth.signInWithPassword({ email, password }); if (error) throw error; },
  async signUp(email: string, password: string) {
    const { data, error } = await supabase!.auth.signUp({ email, password, options: { emailRedirectTo: auth.redirect() } });
    if (error) throw error;
    return { needsConfirm: !data.session };
  },
  async resetPassword(email: string) { const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: auth.redirect() }); if (error) throw error; },
  async setPassword(password: string) { const { error } = await supabase!.auth.updateUser({ password }); if (error) throw error; },
  async sendLink(email: string) {
    const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: auth.redirect(), shouldCreateUser: false } });
    if (error) throw error;
  },
  async verifyCode(email: string, token: string) { const { error } = await supabase!.auth.verifyOtp({ email, token, type: 'email' }); if (error) throw error; },
  async signOut() { await supabase?.auth.signOut(); window.location.hash = ''; },
  async createProfile(p: { handle: string; display_name: string; accent: string }) {
    if (!supabase) return;
    const s = await auth.session(); if (!s) throw new Error('Sin sesión');
    const { error } = await supabase.from('profiles').insert({ id: s.user.id, ...p }); if (error) throw error;
  },
};

async function uid() { const s = await auth.session(); if (!s) throw new Error('Sin sesión'); return s.user.id; }

export const liveRepo: Repo = {
  mode: 'live',
  async load() {
    const sb = supabase!, s = await auth.session();
    const empty: Snapshot = { me: null, members: [], readings: [], friendships: [], comments: [], reactions: [], myMeta: {}, context: '' };
    if (!s) return empty;
    const [pr, rd, fr, cm, rc, pn, rp] = await Promise.all([
      sb.from('profiles').select('*'),
      sb.from('readings').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(500),
      sb.from('friendships').select('*'),
      sb.from('comments').select('*').order('created_at').limit(2000),
      sb.from('reactions').select('reading_id,user_id,emoji,created_at').limit(5000),
      sb.from('private_notes').select('context,meta').eq('user_id', s.user.id).maybeSingle(),
      sb.from('reading_private').select('reading_id,note'),
    ]);
    for (const r of [pr, rd]) if (r.error) throw r.error;
    const members = (pr.data || []) as Profile[];
    const priv = new Map((rp.data || []).map((x: { reading_id: string; note: string }) => [x.reading_id, x.note]));
    const readings = ((rd.data || []) as Reading[]).map(r => priv.has(r.id) ? { ...r, note: priv.get(r.id) || '', note_private: true } : r);
    return {
      me: members.find(m => m.id === s.user.id) || null, members, readings,
      friendships: (fr.data || []) as Friendship[], comments: (cm.data || []) as Comment[], reactions: (rc.data || []) as Reaction[],
      myMeta: (pn.data?.meta as ProfileMeta) || {}, context: pn.data?.context || '',
    };
  },
  async saveReading(r) {
    const sb = supabase!, me = await uid();
    const row = { date: r.date, cards: r.cards, positions: r.positions ?? null, tags: r.tags, note: r.note_private ? '' : r.note, visibility: r.visibility || 'friends', user_id: me };
    let id = r.id;
    if (id) { const { error } = await sb.from('readings').update(row).eq('id', id); if (error) throw error; }
    else { const { data, error } = await sb.from('readings').insert(row).select('id').single(); if (error) throw error; id = data.id; }
    if (r.note_private) { const { error } = await sb.from('reading_private').upsert({ reading_id: id, note: r.note }); if (error) throw error; }
    else await sb.from('reading_private').delete().eq('reading_id', id);
  },
  async deleteReading(id) { const { error } = await supabase!.from('readings').delete().eq('id', id); if (error) throw error; },
  async saveProfile(p) {
    const me = await uid();
    const { id: _i, circle_id: _c, meta: _m, ...rest } = p;
    const { error } = await supabase!.from('profiles').update(rest).eq('id', me); if (error) throw error;
  },
  async saveMyMeta(meta) {
    const me = await uid();
    const { error } = await supabase!.from('private_notes').upsert({ user_id: me, meta, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }); if (error) throw error;
  },
  async saveContext(text) {
    const me = await uid();
    const { error } = await supabase!.from('private_notes').upsert({ user_id: me, context: text, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }); if (error) throw error;
  },
  async comment(readingId, body) { const me = await uid(); const { error } = await supabase!.from('comments').insert({ reading_id: readingId, user_id: me, body }); if (error) throw error; },
  async deleteComment(id) { const { error } = await supabase!.from('comments').delete().eq('id', id); if (error) throw error; },
  async toggleReaction(readingId, emoji, on) {
    const me = await uid();
    const q = on ? supabase!.from('reactions').insert({ reading_id: readingId, user_id: me, emoji }) : supabase!.from('reactions').delete().match({ reading_id: readingId, user_id: me, emoji });
    const { error } = await q; if (error && !/duplicate/i.test(error.message)) throw error;
  },
  async searchProfiles(q) { const { data, error } = await supabase!.rpc('search_profiles', { q }); if (error) throw error; return (data || []) as ProfileHit[]; },
  async requestFriend(id) { const { data, error } = await supabase!.rpc('request_friend', { target: id }); if (error) throw error; return String(data); },
  async acceptFriend(fid) { const { error } = await supabase!.from('friendships').update({ status: 'accepted' }).eq('id', fid); if (error) throw error; },
  async removeFriend(fid) { const { error } = await supabase!.from('friendships').delete().eq('id', fid); if (error) throw error; },
  subscribe(onChange) {
    let t: number | undefined;
    const ping = () => { window.clearTimeout(t); t = window.setTimeout(onChange, 250); };
    const ch = supabase!.channel('taro-live');
    for (const table of ['readings', 'comments', 'reactions', 'friendships']) ch.on('postgres_changes', { event: '*', schema: 'public', table }, ping);
    ch.subscribe();
    return () => { supabase!.removeChannel(ch); };
  },
};

/* ---------------- Modo demo (sin base de datos, guarda en este navegador) ---------------- */
const LS = 'taro-demo-v2';
const today = new Date();
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ago = (n: number) => iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));

function seed(): Snapshot {
  const P = (id: string, handle: string, name: string, accent: string, tags: string[], natal: Profile['natal']): Profile => ({ id, handle, display_name: name, accent, tags, natal, meta: {}, circle_id: null });
  const v = P('demo-valentino', 'valentino', 'Valentino', '#B58CE7', ['Energía general', 'Diego', 'Personal', 'Trabajo', 'Familia'], [['Ascendente', 'Libra', 1], ['Sol', 'Géminis', 9], ['Luna', 'Piscis', 6], ['Venus', 'Cáncer', 10], ['Marte', 'Leo', 11], ['Mercurio', 'Tauro', 8], ['Júpiter', 'Sagitario', 3], ['Saturno', 'Capricornio', 4]]);
  const d = P('demo-diego', 'diego', 'Diego', '#69CDA6', ['Energía general', 'Valentino', 'Personal', 'Trabajo', 'Familia'], [['Ascendente', 'Escorpio', 1], ['Sol', 'Leo', 10], ['Luna', 'Tauro', 7]]);
  const a = P('demo-angie', 'angie', 'Angie', '#F5A9CE', ['Energía general', 'Personal', 'Trabajo'], [['Ascendente', 'Acuario', 1], ['Sol', 'Sagitario', 11], ['Luna', 'Cáncer', 6]]);
  const R = (id: string, user: string, date: string, cards: [string, boolean?][], tags: string[], note: string, extra: Partial<Reading> = {}): Reading => ({ id, user_id: user, date, cards: cards.map(([c, r]) => ({ c, r: !!r })), tags, note, visibility: 'friends', created_at: date + 'T12:00:00Z', ...extra });
  return {
    me: v, members: [v, d, a], myMeta: { love: 'Diego', studio: 'tu estudio' }, context: '',
    friendships: [{ id: 'f1', requester: v.id, addressee: d.id, status: 'accepted' }, { id: 'f2', requester: a.id, addressee: v.id, status: 'accepted' }],
    readings: [
      R('r1', v.id, ago(0), [['copas-1'], ['maj-18'], ['bastos-14']], ['Energía general'], 'Amor — el corazón está abierto y con ganas de dar.\n\nTrabajo — todavía hay niebla: no decidir hasta que aclare.'),
      R('r4', d.id, ago(0), [['maj-19'], ['pentaculos-8'], ['copas-2']], ['Valentino'], 'Día de sol. Ejemplo de tirada de Diego.'),
      R('r6', a.id, ago(0), [['espadas-1'], ['maj-3'], ['bastos-6']], ['Trabajo'], 'Ejemplo de tirada de Angie.'),
      R('r2', v.id, ago(1), [['maj-17'], ['copas-11'], ['pentaculos-13']], ['Personal'], 'Una calma nueva después de semanas movidas.', { note_private: true }),
      R('r5', d.id, ago(2), [['espadas-1'], ['maj-10'], ['copas-9']], ['Energía general'], ''),
      R('r3', v.id, ago(4), [['espadas-3'], ['maj-6'], ['bastos-8']], ['Diego', 'Trabajo'], 'Ejemplo de tirada en modo demo.'),
    ],
    comments: [{ id: 'c1', reading_id: 'r4', user_id: v.id, body: '¡Qué buena energía! ☀️', created_at: ago(0) + 'T14:00:00Z' }, { id: 'c2', reading_id: 'r1', user_id: a.id, body: 'Esa Luna en el medio… ojo con las suposiciones 🌙', created_at: ago(0) + 'T15:00:00Z' }],
    reactions: [{ reading_id: 'r4', user_id: a.id, emoji: '✨', created_at: ago(0) + 'T13:00:00Z' }, { reading_id: 'r4', user_id: v.id, emoji: '💜', created_at: ago(0) + 'T13:30:00Z' }, { reading_id: 'r1', user_id: d.id, emoji: '💜', created_at: ago(0) + 'T16:00:00Z' }],
  };
}
function read(): Snapshot { try { const s = localStorage.getItem(LS); if (s) return JSON.parse(s); } catch { /* ignore */ } const s = seed(); write(s); return s; }
function write(s: Snapshot) { try { localStorage.setItem(LS, JSON.stringify(s)); } catch { /* ignore */ } }
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(f => f());
const mut = (f: (s: Snapshot) => void) => { const s = read(); f(s); write(s); emit(); };

export const demoRepo: Repo = {
  mode: 'demo',
  async load() { return read(); },
  async saveReading(r) {
    mut(s => {
      if (r.id) s.readings = s.readings.map(x => x.id === r.id ? { ...x, ...r, id: x.id } as Reading : x);
      else s.readings.unshift({ ...r, id: 'r' + Date.now().toString(36), user_id: s.me!.id, created_at: new Date().toISOString() } as Reading);
    });
  },
  async deleteReading(id) { mut(s => { s.readings = s.readings.filter(x => x.id !== id); }); },
  async saveProfile(p) { mut(s => { s.members = s.members.map(m => m.id === s.me!.id ? { ...m, ...p, id: m.id } : m); s.me = s.members.find(m => m.id === s.me!.id)!; }); },
  async saveMyMeta(meta) { mut(s => { s.myMeta = meta; }); },
  async saveContext(text) { mut(s => { s.context = text; }); },
  async comment(readingId, body) { mut(s => { s.comments.push({ id: 'c' + Date.now().toString(36), reading_id: readingId, user_id: s.me!.id, body, created_at: new Date().toISOString() }); }); },
  async deleteComment(id) { mut(s => { s.comments = s.comments.filter(c => c.id !== id); }); },
  async toggleReaction(readingId, emoji, on) {
    mut(s => { s.reactions = s.reactions.filter(x => !(x.reading_id === readingId && x.user_id === s.me!.id && x.emoji === emoji)); if (on) s.reactions.push({ reading_id: readingId, user_id: s.me!.id, emoji, created_at: new Date().toISOString() }); });
  },
  async searchProfiles(q) {
    const s = read(), extra: ProfileHit[] = [{ id: 'demo-luna', handle: 'luna', display_name: 'Luna (ejemplo)', accent: '#94BFF2', sun: 'Piscis', moon: 'Aries', asc_sign: 'Virgo', relation: 'none' }];
    const rel = (id: string): ProfileHit['relation'] => { const f = s.friendships.find(x => (x.requester === id && x.addressee === s.me!.id) || (x.addressee === id && x.requester === s.me!.id)); return !f ? 'none' : f.status === 'accepted' ? 'friend' : f.requester === s.me!.id ? 'sent' : 'received'; };
    const big = (p: Profile, n: string) => p.natal?.find(x => x[0] === n)?.[1] || null;
    return [...s.members.filter(m => m.id !== s.me!.id).map(m => ({ id: m.id, handle: m.handle, display_name: m.display_name, accent: m.accent, sun: big(m, 'Sol'), moon: big(m, 'Luna'), asc_sign: big(m, 'Ascendente'), relation: rel(m.id) })), ...extra]
      .filter(h => (h.handle + h.display_name).toLowerCase().includes(q.toLowerCase()));
  },
  async requestFriend(id) { mut(s => { if (!s.friendships.some(f => (f.requester === id || f.addressee === id))) s.friendships.push({ id: 'f' + Date.now(), requester: s.me!.id, addressee: id, status: 'pending' }); }); return 'pending'; },
  async acceptFriend(fid) { mut(s => { s.friendships = s.friendships.map(f => f.id === fid ? { ...f, status: 'accepted' } : f); }); },
  async removeFriend(fid) { mut(s => { s.friendships = s.friendships.filter(f => f.id !== fid); }); },
  subscribe(f) { listeners.add(f); return () => { listeners.delete(f); }; },
};
/** Solo en demo: cambiar "quién soy" para probar otras vistas. */
export function demoActAs(id: string) { mut(s => { const m = s.members.find(x => x.id === id); if (m) s.me = m; }); }

export const repo: Repo = isLive ? liveRepo : demoRepo;
