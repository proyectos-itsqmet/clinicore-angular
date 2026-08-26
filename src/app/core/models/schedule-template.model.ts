import type { ConsultorioRef } from './consultorio.model';
import type { Establishment } from './establishment.model';
import type { Servicio } from './servicio.model';

/** Mirrors `java.time.DayOfWeek`'s enum constant names exactly — Jackson serializes it as this literal, uppercase English string. */
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

/** The nested doctor shape `ScheduleTemplateService#mapToDTO` actually sends — NOT the full `AdminDoctor` (no `email`/`speciality`/`gender`/`ci` here). */
export interface ScheduleTemplateDoctorRef {
  uuid: string;
  firstName?: string;
  lastName?: string;
}

/**
 * `administracion/horarios` — a weekly recurring GENERATION PATTERN.
 *
 * CORRECTED 2026-08-25. This block used to state that
 * `ScheduleTemplateService` had no `ScheduleRepository` dependency "by
 * design", so an already-generated `Schedule` was never touched by a write
 * here. That is NO LONGER TRUE: the service now injects `ScheduleRepository`
 * and `sweepTemplateSchedules` runs `deleteAll` on both update and delete.
 *
 * What still holds: only slots with `STATUS_FREE` are swept, so a booked slot
 * survives. What no longer holds: the guarantee is a runtime filter now, not a
 * structural impossibility — and the suite that proved it
 * (`ScheduleTemplateServiceTest`, 454 lines) was deleted in commit 7f69968.
 * Treat "editing a template deletes future free slots" as real behaviour.
 *
 * `startTime`/`endTime` travel as `"HH:mm:ss"` — Jackson's default
 * `LocalTime` serialization, the same convention `ScheduleDTO.hour` already
 * uses (see `specialty-detail.component.ts`'s own `:00`-padding idiom, reused
 * here for the same reason: a native `<input type="time">` yields `"HH:mm"`).
 */
export interface ScheduleTemplate {
  id: number;
  stablishment: Pick<Establishment, 'id' | 'name' | 'address'>;
  servicio: Pick<Servicio, 'id' | 'name' | 'price'>;
  /** Absent/null = "pool" slot: any doctor assigned to this service at this establishment, not tied to one specific doctor. */
  doctor?: ScheduleTemplateDoctorRef | null;
  /**
   * Default consulting room for this shift, set by an administrator. Copied
   * onto every `Schedule` generated from this template, and inherited by a
   * turn when the operator calls it. Absent on templates created before rooms
   * existed — the operator can still pick one at call time.
   */
  consultorio?: ConsultorioRef | null;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
  validFrom: string;
  /** Null = vigencia abierta (sin fecha de fin). */
  validUntil?: string | null;
  createdAt?: string;
}

/**
 * `POST /api/schedule-templates/save` / `PUT /api/schedule-templates/{id}`
 * body. Relations travel as nested id-only objects — same "nested DTO, not a
 * flat id" convention every other resource in this codebase uses
 * (`ScheduleTemplateService#resolveStablishment`/`resolveServicio`/`resolveDoctor`
 * only ever read `.getId()`/`.getUuid()` off these).
 */
export interface ScheduleTemplateWrite {
  stablishment: { id: number };
  servicio: { id: number };
  doctor?: { uuid: string } | null;
  /** Must belong to the SAME establishment as the template; the backend rejects a mismatch. */
  consultorio?: { id: number } | null;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
  validFrom: string;
  validUntil?: string | null;
}

/**
 * `POST /api/schedules/generate-from-template` body
 * (`GenerateSchedulesFromTemplateBody`). `from`/`to` is a PERIOD, not a
 * single date like `GenerateSchedulesRequest.date` — the whole point of
 * generating from a template instead of `POST /api/schedules/generate` is
 * covering more than one day per call; the interval/hours come from
 * whichever `ScheduleTemplate` applies to each date's weekday, not from this
 * body.
 */
export interface GenerateSchedulesFromTemplateRequest {
  stablishmentId: number;
  serviceId: number;
  doctorId?: string;
  from: string;
  to: string;
}
