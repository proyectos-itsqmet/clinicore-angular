/**
 * What kind of clinical read was recorded. The `_LIST` variants back a
 * single log entry for a whole "browse this patient's history/prescriptions"
 * call (one entry per HTTP call, not one per row returned) — mirrors
 * `ClinicalResourceType` (Backend_QMS).
 */
export type ClinicalResourceType = 'ENCOUNTER' | 'ENCOUNTER_LIST' | 'PRESCRIPTION' | 'PRESCRIPTION_LIST';

/**
 * One row of "who read which patient's clinical data" — an audit of ACCESS,
 * never of edits (`create()`/`update()` on Encounter/Prescription never write
 * here). Mirrors `ClinicalAccessLogDTO` (Backend_QMS) exactly.
 *
 * `resourceId` is `null` for the `*_LIST` resource types (a browse call logs
 * once, not once per row) — `auditoria-hc-list.component.ts` renders that
 * explicitly instead of as a blank cell. No denormalized patient/accessor
 * display name exists on the wire — only raw UUIDs.
 */
export interface ClinicalAccessLog {
  id: number;
  patientUuid: string;
  accessedByUuid: string;
  accessedByRole?: string;
  resourceType: ClinicalResourceType;
  resourceId: number | null;
  accessedAt: string;
}
