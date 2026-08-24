import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { Page, Schedule, ScheduleFilters } from '../models';
import { API_BASE_URL } from './api-base-url';

/**
 * Cupos de agenda — `/api/schedules`.
 *
 * `getAll` acepta los seis filtros del backend y todos son opcionales: sin
 * ninguno se comporta como el listado paginado de siempre. Con `from`/`to` es lo
 * que el calendario del panel necesitaba — un calendario pide un rango, no una
 * página.
 *
 * EL PAGINADO SIGUE APLICANDO con filtros. Un rango de un mes entero puede pasar
 * de 10 filas fácilmente, así que la pantalla que pida un rango tiene que subir
 * el `size` o paginar; pedir un mes y dibujar solo la primera página es un
 * calendario con agujeros y sin ningún error visible.
 */
@Injectable({ providedIn: 'root' })
export class ScheduleApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = inject(API_BASE_URL) + '/api/schedules';

  getAll(
    filters: ScheduleFilters = {},
    page: number = 0,
    size: number = 10,
  ): Observable<Page<Schedule>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (filters.doctorId) {
      params = params.set('doctorId', filters.doctorId);
    }
    if (filters.serviceId != null) {
      params = params.set('serviceId', filters.serviceId.toString());
    }
    if (filters.stablishmentId != null) {
      params = params.set('stablishmentId', filters.stablishmentId.toString());
    }
    if (filters.from) {
      params = params.set('from', filters.from);
    }
    if (filters.to) {
      params = params.set('to', filters.to);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }

    return this.http.get<Page<Schedule>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: number): Observable<Schedule> {
    return this.http.get<Schedule>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
