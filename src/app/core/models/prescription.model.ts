/**
 * One line item of a `Prescription` (a single medication). Mirrors
 * `PrescriptionItemDTO` (Backend_QMS) exactly — free-text fields, no
 * medication catalog/master-data entity backs `medication`/`dosage`.
 */
export interface PrescriptionItem {
  id?: number;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

/**
 * A prescription issued during an `Encounter`. Mirrors `PrescriptionDTO`
 * (Backend_QMS) exactly.
 *
 * IMMUTABLE once issued: `PrescriptionController` has no `@PutMapping` at
 * all. A correction is always a brand-new `POST /api/prescriptions`, never
 * an edit of this record — see `PrescriptionCreate` and
 * `receta-list.component.ts`'s "Emitir corrección" flow.
 *
 * `doctorUuid`/`doctorFullName` are read-only, derived from
 * `encounter.turn.schedule.doctor` (see `PrescriptionService#mapToDTO`).
 */
export interface Prescription {
  id: number;
  encounterId: number;
  notes?: string;
  items: PrescriptionItem[];
  createdAt?: string;
  doctorUuid?: string;
  doctorFullName?: string;
}

/** Payload for `POST /api/prescriptions`. No update/delete payload exists — see `Prescription` above. */
export interface PrescriptionCreate {
  encounterId: number;
  notes?: string;
  items: PrescriptionItem[];
}
