import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { Page, Turn } from '../models';
import { API_BASE_URL } from './api-base-url';

/**
 * Turnos — `/api/turns`.
 *
 * El panel usa el listado general y las dos transiciones de estado. Lo que NO
 * expone este servicio es `GET /api/turns/me` ni `POST /api/turns`: el primero
 * filtra por el paciente del token y es de la app movil, el segundo lo crea un
 * paciente para si mismo. El panel crea turnos con `POST /api/turns/staff`.
 *
 * `markAsTreated` y `cancel` son PUT sin cuerpo. El backend rechaza cancelar un
 * turno ya atendido o ya cancelado, asi que la pantalla tiene que estar
 * preparada para un 400 aunque el boton se vea habilitado.
 */
@Injectable({ providedIn: 'root' })
export class TurnApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = inject(API_BASE_URL) + '/api/turns';

  getAll(page: number = 0, size: number = 10): Observable<Page<Turn>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<Page<Turn>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: number): Observable<Turn> {
    return this.http.get<Turn>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  /** Crea un turno desde el mostrador, a nombre del operador autenticado. */
  createByStaff(turn: Partial<Turn>): Observable<Turn> {
    return this.http.post<Turn>(`${this.API_URL}/staff`, turn, { withCredentials: true });
  }

  markAsTreated(id: number): Observable<Turn> {
    return this.http.put<Turn>(`${this.API_URL}/${id}/treated`, {}, { withCredentials: true });
  }

  cancel(id: number): Observable<Turn> {
    return this.http.put<Turn>(`${this.API_URL}/${id}/cancelled`, {}, { withCredentials: true });
  }
}
