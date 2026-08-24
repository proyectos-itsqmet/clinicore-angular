import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { MetricGroup, MetricPoint, MetricRange, MetricSummary } from '../models';
import { API_BASE_URL } from './api-base-url';

/**
 * Agregados de solo lectura del panel — `/api/metrics/*`.
 *
 * Nada de esto escribe, y ninguna de las cinco llamadas necesita una tabla que
 * no exista: son conteos sobre turnos, agenda y catálogos. Es lo que hace que
 * seis destinos del panel (Dashboard x2, Métricas x3, Reportes → General) se
 * puedan construir sin tocar el esquema.
 *
 * El rango es OPCIONAL en todas. Sin rango, el backend devuelve el histórico
 * completo — que es lo que quiere una tarjeta de "total de pacientes"; con
 * rango, lo que quiere un gráfico.
 */
@Injectable({ providedIn: 'root' })
export class MetricsApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = inject(API_BASE_URL) + '/api/metrics';

  getSummary(range: MetricRange = {}): Observable<MetricSummary> {
    return this.http.get<MetricSummary>(`${this.API_URL}/summary`, {
      params: this.rangeParams(range),
      withCredentials: true,
    });
  }

  getTurnsByDay(range: MetricRange = {}): Observable<MetricPoint[]> {
    return this.http.get<MetricPoint[]>(`${this.API_URL}/turns-by-day`, {
      params: this.rangeParams(range),
      withCredentials: true,
    });
  }

  getTurnsByStatus(range: MetricRange = {}): Observable<MetricGroup[]> {
    return this.http.get<MetricGroup[]>(`${this.API_URL}/turns-by-status`, {
      params: this.rangeParams(range),
      withCredentials: true,
    });
  }

  getTurnsByStablishment(range: MetricRange = {}): Observable<MetricGroup[]> {
    return this.http.get<MetricGroup[]>(`${this.API_URL}/turns-by-stablishment`, {
      params: this.rangeParams(range),
      withCredentials: true,
    });
  }

  getTurnsByDoctor(range: MetricRange = {}): Observable<MetricGroup[]> {
    return this.http.get<MetricGroup[]>(`${this.API_URL}/turns-by-doctor`, {
      params: this.rangeParams(range),
      withCredentials: true,
    });
  }

  /**
   * Un parámetro vacío NO se manda. Spring mapea `?from=` a un string vacío que
   * no parsea como fecha y devuelve 400 — omitirlo es lo que hace que el
   * backend lo trate como "sin filtro", que es la semántica que queremos.
   */
  private rangeParams(range: MetricRange): HttpParams {
    let params = new HttpParams();
    if (range.from) {
      params = params.set('from', range.from);
    }
    if (range.to) {
      params = params.set('to', range.to);
    }
    return params;
  }
}
