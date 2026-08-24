import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Page, Servicio, ServicioCreate, AdminDoctor, ScheduleDTO, ScheduleStatus, Establishment } from '../models';

@Injectable({ providedIn: 'root' })
export class ServicioApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/services';

  getAll(page: number = 0, size: number = 10, name?: string): Observable<Page<Servicio>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
      
    if (name) {
      params = params.set('name', name);
    }

    return this.http.get<Page<Servicio>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: number): Observable<Servicio> {
    return this.http.get<Servicio>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  getDoctors(id: number, name?: string, page: number = 0, size: number = 10): Observable<Page<AdminDoctor>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (name) {
      params = params.set('name', name);
    }

    return this.http.get<Page<AdminDoctor>>(`${this.API_URL}/${id}/doctors`, { params, withCredentials: true });
  }

  getStablishments(id: number, name?: string, page: number = 0, size: number = 10): Observable<Page<Establishment>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (name) {
      params = params.set('name', name);
    }

    return this.http.get<Page<Establishment>>(`${this.API_URL}/${id}/stablishments`, { params, withCredentials: true });
  }

  assignStablishment(serviceId: number, stablishmentId: number): Observable<any> {
    return this.http.post(`http://localhost:8080/api/stablishments/${stablishmentId}/services/${serviceId}`, {}, { withCredentials: true });
  }

  getSchedules(
    id: number,
    filters?: { stablishmentId?: number; date?: string; status?: ScheduleStatus | string },
    page: number = 0,
    size: number = 10
  ): Observable<Page<ScheduleDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filters?.stablishmentId) {
      params = params.set('stablishmentId', filters.stablishmentId.toString());
    }
    if (filters?.date) {
      params = params.set('date', filters.date);
    }
    if (filters?.status) {
      params = params.set('status', filters.status);
    }

    return this.http.get<Page<ScheduleDTO>>(`${this.API_URL}/${id}/schedules`, { params, withCredentials: true });
  }

  create(servicio: ServicioCreate): Observable<Servicio> {
    return this.http.post<Servicio>(this.API_URL, servicio, { withCredentials: true });
  }

  update(id: number, servicio: ServicioCreate): Observable<Servicio> {
    return this.http.put<Servicio>(`${this.API_URL}/${id}`, servicio, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
