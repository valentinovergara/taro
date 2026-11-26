export type Placement = [planet: string, sign: string, house: number | '', lon?: number];

export interface ProfileMeta {
  /** Personas con las que suele preguntar en el amor, para personalizar el consejo. */
  love?: string;
  /** Proyecto o estudio propio. */
  studio?: string;
  /** Cartas que le salen seguido (ids). */
  recurring?: string[];
  /** Patrones personales que quiere vigilar. */
  patterns?: string[];
  /** Datos de nacimiento con los que se calculó la carta. */
  birth?: { date: string; time: string | null; place: string; lat: number; lon: number; tz: string } | null;
  birth_skipped?: boolean;
  onboarded?: boolean;
  tour_done?: boolean;
}

export interface Profile {
  id: string;
  handle: string;
  display_name: string;
  accent: string;
  tags: string[];
  natal: Placement[] | null;
  meta: ProfileMeta | null;
  circle_id: string | null;
  /** Personaje elegido como avatar. */
  avatar?: 'sun' | 'moon' | 'star' | 'planet' | 'comet' | 'nebula' | null;
}

export interface Circle { id: string; name: string; invite_code: string }

export interface Friendship { id: string; requester: string; addressee: string; status: 'pending' | 'accepted' }
export interface Comment { id: string; reading_id: string; user_id: string; body: string; created_at: string }
export interface Reaction { reading_id: string; user_id: string; emoji: string; created_at?: string }
export interface ProfileHit { id: string; handle: string; display_name: string; accent: string; sun: string | null; moon: string | null; asc_sign: string | null; relation: 'friend' | 'sent' | 'received' | 'none' }
export const EMOJIS = ['✨', '🔮', '💜', '🌙', '😮', '🙏'] as const;
