import type { Establishment } from './establishment.model';

/**
 * A physical consulting room inside ONE establishment.
 *
 * It is its own resource rather than a field on the doctor because
 * `Doctor.stablishments` is a many-to-many: a doctor works at several sites,
 * and "Consultorio 3" only means something inside one of them. Uniqueness is
 * `(establishment, code)` — two sites may each have their own "03"; one site
 * may not have two.
 *
 * `code` and `label` are NOT redundant, do not collapse them into one. The
 * waiting-room screen paints `code` in the narrow queue column ("03", read
 * from across the room) and `label` in the main panel ("Consultorio 3", what
 * tells the patient which door to walk to). Deriving one from the other forces
 * the screen to invent formatting.
 */
export interface Consultorio {
  id: number;
  code: string;
  label: string;
  stablishment: Pick<Establishment, 'id' | 'name'>;
  /** A room out of service is deactivated, never deleted: templates and already-called turns still point at it. */
  active: boolean;
}

/** `POST /api/consultorios` / `PUT /api/consultorios/{id}` body. */
export interface ConsultorioWrite {
  code: string;
  label: string;
  stablishment: { id: number };
  active?: boolean;
}

/** The room reference nested inside a schedule template — no establishment round-trip. */
export interface ConsultorioRef {
  id: number;
  code: string;
  label: string;
  active?: boolean;
}
