import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  EmployeesMetrics,
  EstablishmentsMetrics,
  MetricsSummary,
  PatientsMetrics,
  TurnsSeries,
} from '../models';

export interface MetricsDateRangeParams {
  from?: string;
  to?: string;
}

export interface MetricsTurnsSeriesParams extends MetricsDateRangeParams {
  stablishmentId?: number;
  serviceId?: number;
}

/**
 * Read-only client for `/api/metrics/**` (`MetricsController` in
 * Backend_QMS). Feeds all six metrics/dashboard admin screens
 * (dashboard/resumen, dashboard/analytics, metricas/establecimientos,
 * metricas/empleados, metricas/pacientes, reportes/general) from ONE
 * service — no HTTP calls scattered into components.
 *
 * Every `from`/`to` pair is OPTIONAL and omitted from the request when
 * blank, exactly like `TurnApiService`/`ScheduleApiService`: the server
 * defaults to a trailing 30-day window ending today and echoes back the
 * range it actually resolved in the response body, so callers read the
 * effective range from the response instead of guessing it client-side.
 */
@Injectable({ providedIn: 'root' })
export class MetricsApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/metrics';

  getSummary(): Observable<MetricsSummary> {
    return this.http.get<MetricsSummary>(`${this.API_URL}/summary`, { withCredentials: true });
  }

  getTurnsSeries(params: MetricsTurnsSeriesParams = {}): Observable<TurnsSeries> {
    return this.http.get<TurnsSeries>(`${this.API_URL}/turns`, {
      params: this.buildParams(params),
      withCredentials: true,
    });
  }

  getEstablishmentMetrics(params: MetricsDateRangeParams = {}): Observable<EstablishmentsMetrics> {
    return this.http.get<EstablishmentsMetrics>(`${this.API_URL}/establishments`, {
      params: this.buildParams(params),
      withCredentials: true,
    });
  }

  getEmployeesMetrics(params: MetricsDateRangeParams = {}): Observable<EmployeesMetrics> {
    return this.http.get<EmployeesMetrics>(`${this.API_URL}/employees`, {
      params: this.buildParams(params),
      withCredentials: true,
    });
  }

  getPatientsMetrics(params: MetricsDateRangeParams = {}): Observable<PatientsMetrics> {
    return this.http.get<PatientsMetrics>(`${this.API_URL}/patients`, {
      params: this.buildParams(params),
      withCredentials: true,
    });
  }

  private buildParams(params: MetricsTurnsSeriesParams): HttpParams {
    let httpParams = new HttpParams();

    if (params.from && params.from.trim()) {
      httpParams = httpParams.set('from', params.from.trim());
    }
    if (params.to && params.to.trim()) {
      httpParams = httpParams.set('to', params.to.trim());
    }
    if (params.stablishmentId != null) {
      httpParams = httpParams.set('stablishmentId', params.stablishmentId.toString());
    }
    if (params.serviceId != null) {
      httpParams = httpParams.set('serviceId', params.serviceId.toString());
    }

    return httpParams;
  }
}
