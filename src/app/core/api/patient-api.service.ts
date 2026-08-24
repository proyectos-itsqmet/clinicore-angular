import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { Page, Patient } from '../models';
import { API_BASE_URL } from './api-base-url';

/**
 * Pacientes — `/api/patients`.
 *
 * SOLO LECTURA desde el panel, y es a proposito, no una limitacion del backend.
 * El endpoint de escritura que existe es `PUT /api/patients/me`, que actualiza
 * al paciente DEL TOKEN — sirve para la app movil, no para que un operador
 * edite a otra persona. Y los datos de identidad (nombre, cedula, fecha de
 * nacimiento, sexo) el backend los ignora incluso ahi: la historia clinica esta
 * archivada con esos datos.
 *
 * Si algun dia el panel tiene que corregir un dato de un paciente, hace falta un
 * endpoint nuevo con su propia autorizacion, no reusar `/me`.
 */
@Injectable({ providedIn: 'root' })
export class PatientApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = inject(API_BASE_URL) + '/api/patients';

  getAll(page: number = 0, size: number = 10): Observable<Page<Patient>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<Page<Patient>>(this.API_URL, { params, withCredentials: true });
  }

  /** El paciente del token. Existe para la app movil; el panel no lo usa. */
  getMe(): Observable<Patient> {
    return this.http.get<Patient>(`${this.API_URL}/me`, { withCredentials: true });
  }
}
