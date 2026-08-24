import type { AdminDoctor } from './doctor.model';
import type { Establishment } from './establishment.model';
import type { Servicio } from './servicio.model';

/** Estado de un cupo de agenda. Coincide con el enum del backend. */
export type ScheduleStatus = 'STATUS_FREE' | 'STATUS_OCCUPIED' | 'STATUS_UNAVAILABLE';

/**
 * Un cupo concreto de agenda — `GET /api/schedules`.
 *
 * NO es una plantilla recurrente. Una fila es "el doctor X atiende el servicio Y
 * en la sede Z el 12 de marzo a las 09:30", y punto. La pantalla "Horarios de
 * atención" del panel pide otra cosa — un patrón semanal — y esa tabla
 * (`schedule_templates`) todavía no existe.
 */
export interface Schedule {
  id: number;
  /** ISO `YYYY-MM-DD`. */
  date: string;
  /** `HH:mm:ss`. */
  hour: string;
  status: ScheduleStatus;
  doctor?: AdminDoctor;
  service?: Servicio;
  stablishment?: Establishment;
  createdAt?: string;
}

/** Filtros de `GET /api/schedules`. Todos opcionales; sin ninguno, pagina todo. */
export interface ScheduleFilters {
  doctorId?: string;
  serviceId?: number;
  stablishmentId?: number;
  from?: string;
  to?: string;
  status?: ScheduleStatus;
}
