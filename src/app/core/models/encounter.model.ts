/**
 * One documented clinical consultation ("historia clínica"), 1:1 with a
 * `Turn` that must already be `TURN_TREATED` when the record is created.
 * Mirrors `EncounterDTO` (Backend_QMS) exactly.
 *
 * `doctorUuid`/`doctorFullName`/`visitDate` are read-only, derived server-side
 * from `turn.schedule.doctor`/`turn.schedule.date` — never sent by the client
 * (see `EncounterService#mapToDTO`).
 */
export interface Encounter {
  id: number;
  turnId: number;
  reasonForVisit: string;
  clinicalNotes?: string;
  diagnosis: string;
  createdAt?: string;
  doctorUuid?: string;
  doctorFullName?: string;
  visitDate?: string;
}

/**
 * Payload for both `POST /api/encounters` and `PUT /api/encounters/{id}`.
 *
 * `turnId` is `@NotNull` on `EncounterDTO` for BOTH requests — even though
 * `EncounterService#update` never reads it (the turn a record belongs to
 * never changes after creation). Omitting it on an edit still fails bean
 * validation with "El turno es obligatorio", so an edit payload MUST carry
 * the encounter's own existing `turnId` even though the server ignores it.
 */
export interface EncounterCreate {
  turnId: number;
  reasonForVisit: string;
  clinicalNotes?: string;
  diagnosis: string;
}
