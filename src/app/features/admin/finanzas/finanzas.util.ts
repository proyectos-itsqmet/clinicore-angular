import type { ClaimStatus, InvoiceLineSourceType, InvoiceStatus, PaymentMethod } from '../../../core/models';
import { formatIsoDateEs } from '../metrics-shared/turn-status.util';

/**
 * Explicit-locale currency formatter for the whole finance group. Deliberately
 * NOT Angular's `CurrencyPipe`/`DecimalPipe` (both read `LOCALE_ID` from DI —
 * `es-EC` in prod, `en-US` in a spec without the provider, the exact same
 * divergence `DatePipe` has, see `metrics-shared/turn-status.util.ts`).
 * `Intl.NumberFormat('es-EC', ...)` takes its locale as a plain argument, so
 * it is byte-identical in tests and in production.
 */
const MONEY_FORMATTER = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a money amount at the display edge. A real `0` renders as an
 * explicit currency zero (e.g. a fully-paid invoice's balance) — never
 * blank, and never confused with "no data" (that distinction belongs to the
 * caller, e.g. an empty aggregation list renders its own empty state instead
 * of calling this at all).
 */
export function formatMoney(amount: number | string | null | undefined): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (value == null || Number.isNaN(value)) {
    return MONEY_FORMATTER.format(0);
  }
  return MONEY_FORMATTER.format(value);
}

/**
 * Formats an `OffsetDateTime` wire value (e.g. `issuedAt`, `paidAt`,
 * `submittedAt`) as "24 ago 14:30". Pure string splitting on top of
 * `formatIsoDateEs` — never `new Date(...)`, so there is no UTC-midnight /
 * timezone roll risk (Ecuador is UTC-5).
 */
export function formatIsoDateTimeEs(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) {
    return '—';
  }
  const [datePart, timePart] = isoDateTime.split('T');
  const time = timePart ? timePart.slice(0, 5) : '';
  return time ? `${formatIsoDateEs(datePart)} ${time}` : formatIsoDateEs(datePart);
}

/**
 * Sums a list of already-fetched payment amounts for display (e.g. "Total
 * pagado" on the invoice detail page). Deliberately reads the payments list
 * directly rather than computing `total - balance` — that would be a SECOND
 * independent derivation of money the server already computed once, and the
 * whole point of rendering `balance` as given is to have exactly one source
 * of truth for it.
 */
export function sumPaymentAmounts(payments: ReadonlyArray<{ amount: number }> | null | undefined): number {
  return (payments ?? []).reduce((sum, payment) => sum + payment.amount, 0);
}

/** Spanish label per `InvoiceStatus` — one status, one label, everywhere in finanzas. */
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  ISSUED: 'Emitida',
  PARTIALLY_PAID: 'Pago parcial',
  PAID: 'Pagada',
  VOID: 'Anulada',
};

/** Standard Tailwind palette utilities (not the custom `@theme` tokens) — same idiom as `TURN_STATUS_BADGE_CLASS`. */
export const INVOICE_STATUS_BADGE_CLASS: Record<InvoiceStatus, string> = {
  ISSUED: 'bg-blue-50 text-blue-700 border border-blue-200',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700 border border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  VOID: 'bg-rose-50 text-rose-700 border border-rose-200',
};

/** Spanish label per `PaymentMethod`. */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  INSURER_SETTLEMENT: 'Liquidación de aseguradora',
};

export const PAYMENT_METHOD_BADGE_CLASS: Record<PaymentMethod, string> = {
  CASH: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CARD: 'bg-blue-50 text-blue-700 border border-blue-200',
  TRANSFER: 'bg-purple-50 text-purple-700 border border-purple-200',
  INSURER_SETTLEMENT: 'bg-amber-50 text-amber-700 border border-amber-200',
};

/** Spanish label per `ClaimStatus`. */
export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  SUBMITTED: 'Presentado',
  ACCEPTED: 'Aceptado',
  REJECTED: 'Rechazado',
  PAID: 'Pagado',
};

export const CLAIM_STATUS_BADGE_CLASS: Record<ClaimStatus, string> = {
  SUBMITTED: 'bg-amber-50 text-amber-700 border border-amber-200',
  ACCEPTED: 'bg-blue-50 text-blue-700 border border-blue-200',
  PAID: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border border-rose-200',
};

/** Spanish label per `InvoiceLineSourceType`, for the line-items table and the create form. */
export const INVOICE_LINE_SOURCE_LABELS: Record<InvoiceLineSourceType, string> = {
  TURN: 'Turno',
  PACKAGE: 'Paquete',
  SESSION_PLAN: 'Plan de sesiones',
  FREE_LINE: 'Cargo manual',
};
