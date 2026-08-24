/**
 * Catalogo de especialidades medicas del panel — `GET /api/specialities`.
 *
 * `Speciality` con la grafia britanica y no `Specialty` a proposito: ese nombre
 * ya lo usa el modelo de la landing (`specialties.model.ts`), que es otra cosa
 * — una tarjeta de marketing con foto y precio, no una fila de catalogo. Y
 * ademas es como se llama la tabla y la ruta del backend.
 */
export interface Speciality {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  /** Solo lectura: cuantos doctores la tienen asignada. */
  doctorCount?: number;
  createdAt?: string;
}

export interface SpecialityCreate {
  name: string;
  description?: string;
  active?: boolean;
}
