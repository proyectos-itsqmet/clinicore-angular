import type { Operator } from './operator.model';
import type { Patient } from './patient.model';
import type { Schedule } from './schedule.model';

/**
 * Estado de un turno. Coincide con el enum del backend — incluido
 * `TURN_WAITNG`, que está mal escrito ahí y por eso está mal escrito acá.
 * Corregirlo es una migración de datos, no un rename: hay filas guardadas con
 * ese valor. Si algún día se arregla, se arregla en los dos lados a la vez.
 */
export type TurnStatus =
  'TURN_PENDING' | 'TURN_WAITNG' | 'TURN_IN_TREATMENT' | 'TURN_TREATED' | 'TURN_CANCELLED';

/**
 * Un turno — `GET /api/turns`.
 *
 * El `patient` que llega acá viene RECORTADO por el backend: `TurnService`
 * omite deliberadamente su `uuid` y su `password`, así que solo trae nombre,
 * apellido, correo y cédula. Por eso el tipo es `Partial<Patient>` y no
 * `Patient` — declarar el uuid sería prometer un dato que no viene, y cualquier
 * pantalla que intente navegar al paciente desde acá se va a encontrar con
 * `undefined`.
 */
export interface Turn {
  id: number;
  /** El número de ticket. Se llama `order` en el contrato. */
  order: number;
  status: TurnStatus;
  createdAt?: string;
  finishedAt?: string;
  cancelledAt?: string;
  operator?: Operator;
  patient?: Partial<Patient>;
  schedule?: Schedule;
}

/** Filtros de `GET /api/turns/me`. El listado del panel hoy solo pagina. */
export interface TurnFilters {
  status?: TurnStatus;
  from?: string;
  to?: string;
}
