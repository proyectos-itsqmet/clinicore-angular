import type { Establishment } from './establishment.model';

/**
 * Un día en el que no se agenda — `GET /api/holidays`.
 *
 * `stablishment` OPCIONAL es lo que hace útil a la tabla: ausente significa
 * feriado nacional y aplica a todas las sedes; presente significa que esa sede
 * sola no atiende. Una pantalla que muestre solo el nombre y esconda esa
 * distinción está mintiendo sobre a quién afecta cada fila.
 */
export interface Holiday {
  id: number;
  /** ISO `YYYY-MM-DD`. */
  date: string;
  name: string;
  /** Ausente = feriado nacional. */
  stablishment?: Establishment;
  createdAt?: string;
}

/**
 * El backend recibe la sede ANIDADA, no como id suelto — es la convención de
 * `ScheduleDTO` y la sigue todo el proyecto. Basta con el `id` adentro.
 */
export interface HolidayCreate {
  date: string;
  name: string;
  stablishment?: { id: number };
}
