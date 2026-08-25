import type { TurnStatus } from '../../../core/models';

/**
 * Stacking/legend order shared by every metrics screen. Matches the
 * `TurnStatus` enum declaration order in Backend_QMS
 * (`com.devluis.types.TurnStatus`).
 */
export const TURN_STATUS_ORDER: readonly TurnStatus[] = [
  'TURN_PENDING',
  'TURN_WAITNG',
  'TURN_IN_TREATMENT',
  'TURN_TREATED',
  'TURN_CANCELLED',
];

/** Same Spanish labels as `turn-list.component.ts#getStatusLabel` — one status, one label, everywhere in the panel. */
export const TURN_STATUS_LABELS: Record<TurnStatus, string> = {
  TURN_PENDING: 'Pendiente',
  TURN_WAITNG: 'En Espera',
  TURN_IN_TREATMENT: 'En Atención',
  TURN_TREATED: 'Atendido',
  TURN_CANCELLED: 'Cancelado',
};

/** Same badge classes as `turn-list.component.ts#getStatusBadgeClass` — standard Tailwind palette utilities, not the custom `@theme` tokens. */
export const TURN_STATUS_BADGE_CLASS: Record<TurnStatus, string> = {
  TURN_PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  TURN_WAITNG: 'bg-blue-50 text-blue-700 border border-blue-200',
  TURN_IN_TREATMENT: 'bg-purple-50 text-purple-700 border border-purple-200',
  TURN_TREATED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  TURN_CANCELLED: 'bg-rose-50 text-rose-700 border border-rose-200',
};

/**
 * Literal hex fills for SVG/CSS-driven bars. An SVG `fill` attribute needs
 * an actual color value, not a Tailwind utility class, so these are plain
 * hex — picked to match the `-500` shade of each status's badge palette
 * above, so a status reads as the same color everywhere in the panel.
 */
export const TURN_STATUS_BAR_COLOR: Record<TurnStatus, string> = {
  TURN_PENDING: '#f59e0b',
  TURN_WAITNG: '#3b82f6',
  TURN_IN_TREATMENT: '#a855f7',
  TURN_TREATED: '#10b981',
  TURN_CANCELLED: '#f43f5e',
};

const MONTH_LABELS_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
] as const;

/**
 * Formats an ISO `YYYY-MM-DD` date as e.g. "24 ago" using a FIXED Spanish
 * month array — never `DatePipe`. `LOCALE_ID` is `es-EC` in `app.config.ts`
 * but falls back to `en-US` in specs that don't provide it, so a
 * `DatePipe`-formatted month name would silently differ between test and
 * production (see `calendario-list.component.ts`'s `WEEKDAY_LABELS` for the
 * same precedent applied to weekday names).
 *
 * Pure string splitting also sidesteps the `new Date('YYYY-MM-DD')`
 * UTC-midnight trap: Ecuador is UTC-5, so building a `Date` from a bare ISO
 * date and reading it back with local getters can roll the calendar day
 * back by one.
 */
export function formatIsoDateEs(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  const monthIndex = Number(month) - 1;
  const monthLabel = MONTH_LABELS_SHORT[monthIndex] ?? month;
  return `${Number(day)} ${monthLabel}`;
}

/**
 * Formats a raw 0.0–1.0 ratio as a percentage string, OR a caller-supplied
 * label when there was no denominator to compute it from.
 *
 * `occupancyRate`/`cancellationRate` arrive pre-computed as `0.0` from
 * Backend_QMS's `MetricsService` whenever the denominator (`totalSlots`,
 * `turnsInPeriod`) is zero — indistinguishable from a genuine 0% unless the
 * caller ALSO checks that denominator. This function forces that check at
 * the call site instead of silently printing "0.0%" for "no data".
 */
export function formatRatePercent(rate: number, hasDenominator: boolean, zeroDenominatorLabel: string): string {
  return hasDenominator ? `${(rate * 100).toFixed(1)}%` : zeroDenominatorLabel;
}

/**
 * Extracts a user-facing error message from an HTTP error response, trying
 * both shapes this backend uses: `{ message }` from `GlobalExceptionHandler`
 * (every `MetricsController` failure, e.g. an inverted date range) and
 * `{ error }` from the older `TurnController`/`ScheduleController`
 * convention (see `turn-list.component.ts`'s action handlers). Falls back
 * to a caller-supplied Spanish message when neither is present (network
 * failure, CORS, etc.).
 */
export function extractApiErrorMessage(err: unknown, fallback: string): string {
  const body = (err as { error?: { message?: string; error?: string } } | undefined)?.error;
  return body?.message || body?.error || fallback;
}

/**
 * Detects a clinical per-record permission denial (Encounter/Prescription/
 * clinical-access-logs). This is deliberately NOT just `err.status === 403`:
 * `ClinicalAccessGuard` (Backend_QMS) throws a PLAIN `RuntimeException` for a
 * record-level denial (e.g. a doctor who is not the treating doctor of this
 * record) — never `AccessDeniedException` — and `GlobalExceptionHandler`'s
 * generic `@ExceptionHandler(RuntimeException.class)` maps EVERY
 * RuntimeException to HTTP 400, not 403 (confirmed by reading
 * `GlobalExceptionHandler.java`: there is no special case for this message).
 * So the realistic, guaranteed signal is the MESSAGE content, not the status
 * code — mirroring this codebase's own established convention for the exact
 * same ambiguity (`TurnController#markAsTreated`/`cancelTurn` already do
 * `e.getMessage().contains("permisos")`).
 *
 * A real `403` is also treated as a match, defensively: the coarse role gate
 * declared in `GlobalConfig`'s URL matchers (e.g. ROLE_EMPLOYEE hitting a
 * staff-only clinical route at all) is enforced by Spring Security's filter
 * chain BEFORE the request reaches a controller, and CAN surface as a genuine
 * unmodified 403 in that earlier, coarser case.
 */
export function isPermissionDeniedError(err: unknown, message: string): boolean {
  const status = (err as { status?: number } | undefined)?.status;
  return status === 403 || /permisos/i.test(message);
}
