import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { Page, TimeOff, TimeOffCreate, TimeOffKind } from '../models';
import { API_BASE_URL } from './api-base-url';

/** Filtros de `GET /api/time-off`. Todos opcionales. */
export interface TimeOffFilters {
  doctorId?: string;
  kind?: TimeOffKind;
  from?: string;
  to?: string;
}

/**
 * Ausencias de doctores — `/api/time-off`.
 *
 * UN SERVICIO PARA DOS PANTALLAS. Vacaciones y Permisos se separan con `kind`,
 * no con dos rutas: el recurso es el mismo y duplicarlo duplicaría también las
 * validaciones de rango y solapamiento, que son la parte que importa.
 *
 * El rango filtra por SOLAPAMIENTO, no por contención: una ausencia del 1 al 30
 * aparece cuando preguntás por el 15, aunque ni su inicio ni su fin caigan en la
 * ventana. Es lo correcto y conviene saberlo antes de dudar de los resultados.
 */
@Injectable({ providedIn: 'root' })
export class TimeOffApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = inject(API_BASE_URL) + '/api/time-off';

  getAll(
    filters: TimeOffFilters = {},
    page: number = 0,
    size: number = 10,
  ): Observable<Page<TimeOff>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (filters.doctorId) {
      params = params.set('doctorId', filters.doctorId);
    }
    if (filters.kind) {
      params = params.set('kind', filters.kind);
    }
    if (filters.from) {
      params = params.set('from', filters.from);
    }
    if (filters.to) {
      params = params.set('to', filters.to);
    }
    return this.http.get<Page<TimeOff>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: number): Observable<TimeOff> {
    return this.http.get<TimeOff>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  create(timeOff: TimeOffCreate): Observable<TimeOff> {
    return this.http.post<TimeOff>(this.API_URL, timeOff, { withCredentials: true });
  }

  update(id: number, timeOff: TimeOffCreate): Observable<TimeOff> {
    return this.http.put<TimeOff>(`${this.API_URL}/${id}`, timeOff, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
