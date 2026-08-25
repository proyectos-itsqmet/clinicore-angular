import type { Patient } from './patient.model';

/** Mirrors `com.devluis.types.InsurerType` (Backend_QMS). */
export type InsurerType = 'INSURER_PRIVATE' | 'INSURER_PUBLIC';

/**
 * An insurance company a patient may hold coverage with. `type` keeps the
 * distinction between privately-held plans and Ecuador's public insurance
 * schemes (IESS/ISSFA/ISSPOL/MSP) on ONE catalog table instead of two —
 * mirrors `InsurerDTO` (Backend_QMS). `administracion/planes-de-cobertura`
 * manages this catalog; it is NOT patient-scoped (see `PatientCoverage`).
 */
export interface Insurer {
  id: number;
  name: string;
  type: InsurerType;
  createdAt?: string;
}

export interface InsurerCreate {
  name: string;
  type: InsurerType;
}

/**
 * A named plan an Insurer offers. Mirrors `CoveragePlanDTO` (Backend_QMS).
 *
 * `coveragePercentage` and `copayAmount` are MUTUALLY EXCLUSIVE for BILLING —
 * see `CoveragePricingService` (Backend_QMS): a plan with a `copayAmount` set
 * charges the patient exactly that amount and `coveragePercentage` is only
 * echoed back for transparency, never applied. See
 * `coverage-plan-pricing.util.ts` for the shared message every screen that
 * shows a plan uses to communicate this, instead of re-wording it per screen.
 */
export interface CoveragePlan {
  id: number;
  insurer: Insurer;
  name: string;
  /** 0-100 inclusive. Ignored for billing whenever `copayAmount` is set (still required by the backend DTO). */
  coveragePercentage: number;
  /** Fixed amount charged instead of the percentage. `null`/absent = no copay tier (percentage applies). */
  copayAmount?: number | null;
  createdAt?: string;
}

export interface CoveragePlanCreate {
  insurer: { id: number };
  name: string;
  coveragePercentage: number;
  copayAmount?: number | null;
}

/**
 * Links a Patient to a CoveragePlan, with the policy number and validity
 * window a physical insurance card carries. Mirrors `PatientCoverageDTO`
 * (Backend_QMS) — `patient` only ever carries `uuid`/`firstName`/`lastName`,
 * matching `PatientCoverageService#mapToDTO`.
 *
 * AT MOST ONE record may be `active` per patient — enforced by
 * `PatientCoverageService` (Backend_QMS), which silently deactivates any
 * other active record for the same patient on save; there is no database
 * constraint backing this. This type deliberately does NOT encode that
 * guarantee: a list response can legitimately contain more than one
 * `active: true` row if that invariant is ever violated server-side, and
 * every screen that renders this list must show each row's own `active`
 * value independently instead of assuming only one will ever be true.
 */
export interface PatientCoverage {
  id: number;
  patient: Pick<Patient, 'uuid' | 'firstName' | 'lastName'>;
  plan: CoveragePlan;
  policyNumber: string;
  validFrom: string;
  /** `null`/absent = ongoing policy with no known end date yet. */
  validUntil?: string | null;
  active: boolean;
  createdAt?: string;
}

export interface PatientCoverageCreate {
  patient: { uuid: string };
  plan: { id: number };
  policyNumber: string;
  validFrom: string;
  validUntil?: string | null;
  active: boolean;
}
