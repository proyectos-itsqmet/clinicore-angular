/**
 * Agregados del panel — `GET /api/metrics/*`.
 *
 * Todos los rangos son opcionales del lado del backend, y `from`/`to` vuelven
 * en la respuesta a proposito: sin eso la pantalla no puede rotular
 * honestamente sobre que periodo son los numeros que muestra.
 */

/** Un punto de una serie de tiempo. */
export interface MetricPoint {
  /** ISO `YYYY-MM-DD`. */
  date: string;
  total: number;
}

/**
 * Una barra de un agrupamiento. `id` es string porque las claves del backend
 * tienen tipos distintos — un establecimiento es numerico, un doctor es UUID —
 * y viaja ya serializada. Sirve para navegar al detalle, no para hacer cuentas.
 */
export interface MetricGroup {
  id: string;
  label: string;
  total: number;
}

export interface MetricSummary {
  from?: string;
  to?: string;

  // Totales del sistema: NO dependen del rango, son cuantos hay hoy.
  totalPatients: number;
  totalDoctors: number;
  totalOperators: number;
  totalStablishments: number;
  totalServices: number;

  // Turnos dentro del rango.
  turnsTotal: number;
  turnsPending: number;
  turnsTreated: number;
  turnsCancelled: number;

  /** Pacientes DISTINTOS con al menos un turno en el rango. */
  activePatients: number;
  /** Cupos libres en el rango: la capacidad que quedo sin usar. */
  schedulesFree: number;
  /** Turnos de hoy, sin importar el rango consultado. */
  turnsToday: number;

  turnsByDay: MetricPoint[];
}

/** Rango que comparten todas las consultas de metricas. */
export interface MetricRange {
  from?: string;
  to?: string;
}
