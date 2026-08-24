import type { AdminDoctor } from './doctor.model';
import type { Establishment } from './establishment.model';
import type { Servicio } from './servicio.model';

export type ScheduleStatus = 'STATUS_FREE' | 'STATUS_OCCUPIED' | 'STATUS_UNAVAILABLE';

export interface GenerateSchedulesRequest {
  serviceId: number;
  stablishmentId: number;
  doctorId: string;
  date: string;
  intervalMinutes: number;
}

export interface ScheduleDTO {
  id?: number;
  date: string;
  hour: string;
  status?: ScheduleStatus | string;
  doctor?: AdminDoctor;
  service?: Servicio;
  stablishment?: Establishment;
  createdAt?: string;
}

export interface CreateSchedulePayload {
  date: string;
  hour: string;
  doctor: {
    uuid: string;
  };
  service: {
    id: number;
  };
  stablishment: {
    id: number;
  };
}
