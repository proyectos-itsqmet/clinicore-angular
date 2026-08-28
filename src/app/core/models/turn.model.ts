import type { Patient } from './patient.model';
import type { Operator } from './operator.model';
import type { ScheduleDTO } from './schedule.model';

export type TurnStatus = 
  | 'TURN_PENDING' 
  | 'TURN_WAITNG' 
  | 'TURN_IN_TREATMENT' 
  | 'TURN_TREATED' 
  | 'TURN_CANCELLED';

export interface Turn {
  id: number;
  order: number;
  /**
   * `"H-003"`: el número que el paciente escucha y ve en la pantalla de sala.
   *
   * Lo formatea el BACKEND con `utils/Ticket`, nunca el cliente. El orden se
   * calcula por servicio y por fecha, así que dos servicios tienen un turno #1
   * el mismo día: sin el prefijo del servicio el número es ambiguo y dos
   * pacientes caminan al mismo llamado.
   *
   * Opcional porque un backend anterior a este campo devuelve la fila sin él, y
   * en ese caso la vista cae a `order` en vez de pintar "undefined".
   */
  ticket?: string;
  status: TurnStatus;
  createdAt: string;
  finishedAt?: string;
  cancelledAt?: string;
  operator?: Operator;
  patient?: Patient;
  schedule?: ScheduleDTO;
  /**
   * El consultorio EFECTIVO por el que salió el llamado — no el del cupo.
   *
   * El cupo trae el que asignó un admin en la plantilla; el operador puede
   * cambiarlo al llamar porque el médico se mudó de sala. Null mientras nadie
   * lo haya llamado, que es correcto: antes del llamado no hay consultorio
   * efectivo.
   */
  consultorio?: { id: number; code: string; label: string };
}

/**
 * Conteo de un día para UNA sede o UN servicio.
 *
 * `pending` es sólo `TURN_PENDING` — la misma etiqueta "Pendiente" que pinta la
 * lista, para que el número de la tarjeta se pueda verificar contando filas. Un
 * turno "En Espera" ya hizo check-in y NO cuenta acá.
 */
export interface TurnScopeCount {
  id: number;
  total: number;
  pending: number;
}

/** Respuesta de `GET /api/turns/daily-counts`. */
export interface TurnDailyCounts {
  date: string;
  byStablishment: TurnScopeCount[];
  byService: TurnScopeCount[];
}

export interface TurnFilterParams {
  status?: TurnStatus | string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  sort?: string;
}
