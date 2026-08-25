import type { Servicio } from './servicio.model';

/**
 * N sessions of ONE `Servicio` sold as a bundle at one combined price
 * (physiotherapy, dentistry cleanings, etc). Mirrors `SessionPlanDTO`
 * (Backend_QMS).
 *
 * DELIBERATELY does not model session consumption — there is no ledger
 * tying a purchased plan to a specific patient's used/remaining sessions
 * anywhere in this codebase. Any screen rendering this type must show the
 * CATALOG only (available plans, price, price-per-session, savings vs
 * buying individually) and must never imply a per-patient balance
 * (e.g. "4 of 10 remaining") — that data does not exist.
 */
export interface SessionPlan {
  id: number;
  servicio: Servicio;
  name: string;
  sessionCount: number;
  price: number;
  /** Read-only. `price / sessionCount`. */
  pricePerSession: number;
  /** Read-only. `sessionCount * Servicio net price` — what the sessions would cost bought one at a time today. */
  regularTotal: number;
  /** Read-only. `regularTotal - price`. Can be negative — surfaced as-is, never clamped. */
  savings: number;
  createdAt?: string;
}

export interface SessionPlanCreate {
  servicio: { id: number };
  name: string;
  sessionCount: number;
  price: number;
}
