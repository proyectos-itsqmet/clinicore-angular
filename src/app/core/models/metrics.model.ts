import type { TurnStatus } from './turn.model';

/**
 * Mirrors `TurnStatusBreakdownDTO` (Backend_QMS) — "how many turns, split by
 * status". Every `TurnStatus` is always present as a key (zero-filled
 * server-side by `MetricsService`), so consumers never need `?? 0` when
 * reading `byStatus[status]`.
 */
export interface TurnStatusBreakdown {
  byStatus: Record<TurnStatus, number>;
  total: number;
}

/** Mirrors `MetricsSummaryDTO` — response of `GET /api/metrics/summary`. Feeds dashboard/resumen. */
export interface MetricsSummary {
  turnsToday: TurnStatusBreakdown;
  totalPatients: number;
  totalDoctors: number;
  totalOperators: number;
  totalEstablishments: number;
  totalServices: number;
}

/**
 * Mirrors `DayTurnsDTO` — one point of the `GET /api/metrics/turns` series.
 * The series is DENSE: every calendar day in the resolved range is present,
 * even ones with zero turns, so a chart never has to fill gaps itself.
 */
export interface DayTurns {
  date: string;
  turns: TurnStatusBreakdown;
}

/**
 * Mirrors `TurnsSeriesDTO` — response of `GET /api/metrics/turns`. Feeds
 * dashboard/analytics and reportes/general (same series, different framing).
 * `from`/`to` echo back whatever range the server actually resolved
 * (defaulted or not), so callers never have to guess it client-side.
 */
export interface TurnsSeries {
  from: string;
  to: string;
  stablishmentId?: number | null;
  serviceId?: number | null;
  days: DayTurns[];
}

/**
 * Mirrors `EstablishmentMetricsDTO` — one row of `GET
 * /api/metrics/establishments`.
 *
 * `occupancyRate` is a RAW 0.0–1.0 ratio, computed server-side as
 * `occupiedSlots / totalSlots` and hardcoded to `0.0` when `totalSlots` is
 * `0` — which is "no occupancy data", not "0% occupied". Callers must check
 * `totalSlots === 0` themselves before formatting this as a percentage (see
 * `formatRatePercent` in `features/admin/metrics-shared`).
 */
export interface EstablishmentMetrics {
  stablishmentId: number;
  name: string;
  servicesCount: number;
  doctorsCount: number;
  turns: TurnStatusBreakdown;
  totalSlots: number;
  occupiedSlots: number;
  occupancyRate: number;
}

/** Mirrors `EstablishmentsMetricsDTO` — response of `GET /api/metrics/establishments`. Feeds metricas/establecimientos. */
export interface EstablishmentsMetrics {
  from: string;
  to: string;
  establishments: EstablishmentMetrics[];
}

/**
 * Mirrors `DoctorMetricsDTO` — one row of `GET /api/metrics/employees`.
 * `noShows` is derived server-side: still `TURN_PENDING` with a schedule
 * date already in the past.
 */
export interface DoctorMetrics {
  doctorId: string;
  firstName: string;
  lastName: string;
  speciality: string;
  attended: number;
  cancelled: number;
  noShows: number;
}

/** Mirrors `OperatorMetricsDTO` — one row of `GET /api/metrics/employees`. */
export interface OperatorMetrics {
  operatorId: string;
  firstName: string;
  lastName: string;
  turnsHandled: number;
  cancelled: number;
}

/** Mirrors `EmployeesMetricsDTO` — response of `GET /api/metrics/employees`. Feeds metricas/empleados. */
export interface EmployeesMetrics {
  from: string;
  to: string;
  doctors: DoctorMetrics[];
  operators: OperatorMetrics[];
}

/**
 * Mirrors `PatientsMetricsDTO` — response of `GET /api/metrics/patients`.
 * Feeds metricas/pacientes. `cancellationRate` has the same raw-ratio /
 * zero-denominator caveat as `EstablishmentMetrics.occupancyRate`, guarded
 * here by `turnsInPeriod === 0`.
 */
export interface PatientsMetrics {
  from: string;
  to: string;
  newPatients: number;
  turnsInPeriod: number;
  cancelledInPeriod: number;
  cancellationRate: number;
}
