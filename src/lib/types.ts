export type Placement = [planet: string, sign: string, house: number | ''];

export interface ProfileMeta {
  /** Personas con las que suele preguntar en el amor, para personalizar el consejo. */
  love?: string;
  /** Proyecto o estudio propio. */
  studio?: string;
  /** Cartas que le salen seguido (ids). */
  recurring?: string[];
  /** Patrones personales que quiere vigilar. */
  patterns?: string[];
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
}

export interface Circle { id: string; name: string; invite_code: string }
