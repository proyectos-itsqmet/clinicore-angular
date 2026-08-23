import type { Establishment } from './establishment.model';
import type { Servicio } from './servicio.model';

export interface AdminDoctor {
  uuid: string;
  email: string;
  firstName: string;
  lastName: string;
  speciality: string;
  gender: string;
  ci: string;
  stablishments?: Establishment[];
  services?: Servicio[];
}

export interface DoctorCreate {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  speciality: string;
  gender: string;
  ci: string;
}
