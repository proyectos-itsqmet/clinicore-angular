import type { BlockReason } from './block-reason.model';
import type { AdminDoctor } from './doctor.model';

/**
 * Vacaciones o permiso. UNA sola forma para las dos pantallas del panel: el
 * efecto sobre la agenda es idéntico y lo único que cambia es cómo se llama.
 */
export type TimeOffKind = 'TIMEOFF_VACATION' | 'TIMEOFF_PERMISSION';

/** Una ausencia de un doctor — `GET /api/time-off`. */
export interface TimeOff {
  id: number;
  doctor: AdminDoctor;
  kind: TimeOffKind;
  /** ISO `YYYY-MM-DD`. */
  startDate: string;
  /** ISO `YYYY-MM-DD`, INCLUSIVO: una ausencia de un día lleva la misma fecha. */
  endDate: string;
  reason?: BlockReason;
  notes?: string;
  createdAt?: string;
}

/** Doctor y motivo viajan anidados, como en el resto del contrato. */
export interface TimeOffCreate {
  doctor: { uuid: string };
  kind: TimeOffKind;
  startDate: string;
  endDate: string;
  reason?: { id: number };
  notes?: string;
}
