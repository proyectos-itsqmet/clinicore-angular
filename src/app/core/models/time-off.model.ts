import type { AdminDoctor } from './doctor.model';
import type { BlockReason } from './block-reason.model';

/** Discriminator for `TimeOff` — mirrors `com.devluis.types.TimeOffKind`. */
export type TimeOffKind = 'KIND_VACATION' | 'KIND_PERMISSION';

/**
 * A doctor unavailable over a date range (`startDate`/`endDate`, both
 * inclusive). Mirrors `TimeOffDTO` (Backend_QMS). One entity backs BOTH
 * "vacaciones" and "permisos" — `kind` is the only thing that tells them
 * apart.
 *
 * `doctor` is intentionally NOT the full `AdminDoctor` shape:
 * `TimeOffService#mapToDTO` builds it with only `uuid`/`firstName`/`lastName`
 * set, and `DoctorDTO` is annotated `@JsonInclude(NON_NULL)` — so `email`,
 * `speciality`, `gender`, `ci`, `stablishments` and `services` are absent
 * from the wire, not just empty strings. Reading `timeOff.doctor.ci` would
 * silently be `undefined` at runtime despite `AdminDoctor` declaring it
 * required; `Pick` documents that gap instead of hiding it.
 */
export interface TimeOff {
  id: number;
  doctor: Pick<AdminDoctor, 'uuid' | 'firstName' | 'lastName'>;
  kind: TimeOffKind;
  startDate: string;
  endDate: string;
  reason: BlockReason;
  createdAt: string;
  /** Same contract as `Holiday.conflictingScheduleIds` — see that doc. */
  conflictingScheduleIds?: number[];
}

export interface TimeOffCreate {
  doctor: { uuid: string };
  kind: TimeOffKind;
  startDate: string;
  endDate: string;
  reason: { id: number };
}
