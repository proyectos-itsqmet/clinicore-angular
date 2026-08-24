import type { Establishment } from './establishment.model';
import type { Servicio } from './servicio.model';

export interface AdminDoctor {
  uuid: string;
  email: string;
  firstName: string;
  lastName: string;
  speciality: string;
  /** Fila del catalogo, cuando el doctor ya esta vinculado a el. */
  specialityId?: number;
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
  /**
   * Cuando viaja, GANA sobre el texto: el backend resuelve el nombre desde el
   * catalogo y lo copia a `speciality`, asi las dos columnas no pueden quedar
   * diciendo cosas distintas. Ausente = texto libre, el camino de siempre.
   */
  specialityId?: number;
  gender: string;
  ci: string;
}
