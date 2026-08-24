import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { Holiday, HolidayCreate, Page } from '../models';
import { API_BASE_URL } from './api-base-url';

/** Filtros de `GET /api/holidays`. Todos opcionales. */
export interface HolidayFilters {
  from?: string;
  to?: string;
  stablishmentId?: number;
}

/**
 * Días feriados — `/api/holidays`.
 *
 * Un detalle del backend que la pantalla tiene que respetar: filtrar por
 * `stablishmentId` devuelve los de esa sede **y también los nacionales**. Es la
 * respuesta correcta — el 25 de diciembre le afecta a la sede igual — pero
 * significa que la tabla no puede rotular todas las filas como "de esta sede".
 * Por eso `Holiday.stablishment` es opcional y hay que mostrarlo.
 *
 * `delete` acá sí borra de verdad, a diferencia de los catálogos: un feriado no
 * es referenciado por ninguna otra fila.
 */
@Injectable({ providedIn: 'root' })
export class HolidayApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = inject(API_BASE_URL) + '/api/holidays';

  getAll(
    filters: HolidayFilters = {},
    page: number = 0,
    size: number = 10,
  ): Observable<Page<Holiday>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (filters.from) {
      params = params.set('from', filters.from);
    }
    if (filters.to) {
      params = params.set('to', filters.to);
    }
    if (filters.stablishmentId != null) {
      params = params.set('stablishmentId', filters.stablishmentId.toString());
    }
    return this.http.get<Page<Holiday>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: number): Observable<Holiday> {
    return this.http.get<Holiday>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  create(holiday: HolidayCreate): Observable<Holiday> {
    return this.http.post<Holiday>(this.API_URL, holiday, { withCredentials: true });
  }

  update(id: number, holiday: HolidayCreate): Observable<Holiday> {
    return this.http.put<Holiday>(`${this.API_URL}/${id}`, holiday, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
