import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { Page, Speciality, SpecialityCreate } from '../models';
import { API_BASE_URL } from './api-base-url';

/**
 * Catálogo de especialidades médicas — `/api/specialities`.
 *
 * `getActive()` existe además de `getAll()` porque son dos consumidores
 * distintos: una tabla quiere páginas y ver también las desactivadas, un
 * desplegable quiere la lista entera y solo las vigentes. Paginar un
 * `<select>` obliga al cliente a recorrer páginas para armarlo.
 *
 * OJO CON `delete`: el backend DESACTIVA, no borra. Hay doctores apuntando a la
 * fila y su especialidad tiene que seguir siendo legible. La pantalla que lo
 * llame debería decir "desactivar", no "eliminar".
 */
@Injectable({ providedIn: 'root' })
export class SpecialityApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = inject(API_BASE_URL) + '/api/specialities';

  getAll(page: number = 0, size: number = 10): Observable<Page<Speciality>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<Page<Speciality>>(this.API_URL, { params, withCredentials: true });
  }

  /** Solo las activas, ordenadas y sin paginar — para desplegables. */
  getActive(): Observable<Speciality[]> {
    return this.http.get<Speciality[]>(`${this.API_URL}/active`, { withCredentials: true });
  }

  getById(id: number): Observable<Speciality> {
    return this.http.get<Speciality>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  create(speciality: SpecialityCreate): Observable<Speciality> {
    return this.http.post<Speciality>(this.API_URL, speciality, { withCredentials: true });
  }

  update(id: number, speciality: SpecialityCreate): Observable<Speciality> {
    return this.http.put<Speciality>(`${this.API_URL}/${id}`, speciality, {
      withCredentials: true,
    });
  }

  /** Desactiva. Ver la nota de la clase. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
