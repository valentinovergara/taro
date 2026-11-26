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
