import type { Patient } from './patient.model';

// Mirrors Backend_QMS com.devluis.types.InvoiceStatus. ISSUED / PARTIALLY_PAID
// / PAID are recomputed server-side from (total, sum(payments)) on every
// payment — never set by the client. VOID is the only "removal" mechanism,
// reachable only via PUT /api/invoices/{id}/void (ROLE_ADMIN, refused once
// PAID).
export type InvoiceStatus = 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';

// Mirrors com.devluis.types.InvoiceLineSourceType. Only TURN lines ever carry
// a non-zero insurerCoveredAmount (priced through CoveragePricingService at
// issue time); PACKAGE/SESSION_PLAN are always 100% patient-responsible;
// FREE_LINE has no catalog backing at all.
export type InvoiceLineSourceType = 'TURN' | 'PACKAGE' | 'SESSION_PLAN' | 'FREE_LINE';

// Mirrors com.devluis.types.PaymentMethod. INSURER_SETTLEMENT is only ever
// created server-side by ClaimService#markAsPaid — never selectable when a
// human registers a front-desk payment.
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'INSURER_SETTLEMENT';

// Mirrors com.devluis.types.ClaimStatus. SUBMITTED -> ACCEPTED -> PAID is the
// happy path; SUBMITTED -> REJECTED is terminal for that claim (no reopening).
export type ClaimStatus = 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'PAID';

/**
 * Response shape for one Invoice line (`InvoiceLineItemDTO`). Every field
 * beyond `sourceType`/`sourceId` is a SNAPSHOT taken at invoice creation —
 * `amount`, `insurerCoveredAmount`, `patientResponsibleAmount`,
 * `insurerNameSnapshot`, `planNameSnapshot` are stored facts, never
 * recomputed from today's catalog. Render them as-is; never re-derive them
 * from a service/price lookup.
 */
export interface InvoiceLineItem {
  id?: number;
  sourceType: InvoiceLineSourceType;
  sourceId?: number;
  description?: string;
  amount: number;
  insurerCoveredAmount?: number;
  patientResponsibleAmount?: number;
  insurerNameSnapshot?: string;
  planNameSnapshot?: string;
}

/**
 * Request shape for one line on `POST /api/invoices`. Per
 * `InvoiceLineItemDTO`'s own docblock: TURN/PACKAGE/SESSION_PLAN require
 * `sourceId`; FREE_LINE requires `description` + `amount` instead (enforced
 * server-side, not expressible with plain validation annotations there).
 */
export interface InvoiceLineItemCreate {
  sourceType: InvoiceLineSourceType;
  sourceId?: number;
  description?: string;
  amount?: number;
}

/**
 * Response shape for one Payment (`PaymentDTO`). `receivedByUuid`/`paidAt`/
 * `claimId` are server-set — never sent by the client.
 */
export interface Payment {
  id?: number;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  receivedByUuid?: string;
  paidAt?: string;
  claimId?: number;
}

/** Request shape for `POST /api/invoices/{invoiceId}/payments`. */
export interface PaymentCreate {
  amount: number;
  method: PaymentMethod;
  reference?: string;
}

/**
 * Response shape for an Invoice (`InvoiceDTO`). `total`/`balance`/`status`/
 * `issuedAt`/`voidedAt`/`voidReason`/`payments` are ALWAYS server-computed —
 * `balance` in particular is `total - sum(payments)`, never persisted, and
 * MUST be rendered as given, never re-derived client-side (two derivations
 * are two chances to disagree with the server).
 */
export interface Invoice {
  id?: number;
  patient: Patient;
  items: InvoiceLineItem[];
  total?: number;
  balance?: number;
  status?: InvoiceStatus;
  issuedAt?: string;
  voidedAt?: string;
  voidReason?: string;
  voidedByUuid?: string;
  payments?: Payment[];
}

/** Request shape for `POST /api/invoices` — only the patient's `uuid` is read server-side. */
export interface InvoiceCreate {
  patient: { uuid: string };
  items: InvoiceLineItemCreate[];
}

/** Request body for `PUT /api/invoices/{id}/void` — a reason is mandatory. */
export interface VoidInvoiceBody {
  reason: string;
}

/**
 * Response shape for a Claim (`ClaimDTO`). On create, only `invoiceId` is
 * client-supplied — `insurerName`/`planName`/`amountClaimed` are derived
 * server-side from that invoice's own line-item snapshots.
 */
export interface Claim {
  id?: number;
  invoiceId: number;
  insurerName?: string;
  planName?: string;
  amountClaimed?: number;
  status?: ClaimStatus;
  submittedAt?: string;
  decidedAt?: string;
  paidAt?: string;
  rejectionReason?: string;
}

/** Request shape for `POST /api/claims`. */
export interface ClaimCreate {
  invoiceId: number;
}

/** Request body for `PUT /api/claims/{id}/reject` — a reason is mandatory. */
export interface RejectClaimBody {
  reason: string;
}

/** Internal aggregation row reshaped by AccountingService — how many invoices, and how much, for one status in a date range. */
export interface InvoiceStatusSummaryRow {
  status: InvoiceStatus;
  count: number;
  totalAmount: number;
}

/** Internal aggregation row reshaped by AccountingService — how many payments, and how much, for one method in a date range. */
export interface PaymentMethodSummaryRow {
  method: PaymentMethod;
  count: number;
  totalAmount: number;
}

/** Internal aggregation row reshaped by AccountingService — how many claims, and how much amountClaimed, for one status in a date range. */
export interface ClaimStatusSummaryRow {
  status: ClaimStatus;
  count: number;
  totalAmount: number;
}

/**
 * Response for `GET /api/accounting/summary`. `invoicedByStatus`/
 * `collectedByMethod` are PERIOD-bounded by `[from, to]`. `outstandingNow` is
 * deliberately NOT period-bounded — the sum of `(total - sum(payments))`
 * across every non-VOID invoice that exists today, regardless of the date
 * filter. Never gate its display behind the date range.
 */
export interface AccountingSummary {
  from?: string;
  to?: string;
  invoicedByStatus: InvoiceStatusSummaryRow[];
  collectedByMethod: PaymentMethodSummaryRow[];
  outstandingNow: number;
}

/** Response for `GET /api/accounting/claims-summary` — bounded by `submittedAt` within `[from, to]`. */
export interface ClaimsSummary {
  from?: string;
  to?: string;
  claimsByStatus: ClaimStatusSummaryRow[];
}
