import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Page, ScheduleTemplate, ScheduleTemplateWrite } from '../models';

/** `administracion/horarios` (`GET`/`POST /save`/`PUT /{id}`/`DELETE /{id} /api/schedule-templates`). */
@Injectable({ providedIn: 'root' })
export class ScheduleTemplateApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/schedule-templates';

  getAll(
    page: number = 0,
    size: number = 10,
    filters?: { stablishmentId?: number; serviceId?: number; doctorId?: string },
  ): Observable<Page<ScheduleTemplate>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (filters?.stablishmentId != null) {
      params = params.set('stablishmentId', filters.stablishmentId.toString());
    }
    if (filters?.serviceId != null) {
      params = params.set('serviceId', filters.serviceId.toString());
    }
    if (filters?.doctorId && filters.doctorId.trim()) {
      params = params.set('doctorId', filters.doctorId.trim());
    }

    return this.http.get<Page<ScheduleTemplate>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: number): Observable<ScheduleTemplate> {
    return this.http.get<ScheduleTemplate>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  /** `POST /api/schedule-templates/save` — this controller uses `/save`, NOT a bare `POST` (verified against `ScheduleTemplateController.java`). */
  create(payload: ScheduleTemplateWrite): Observable<ScheduleTemplate> {
    return this.http.post<ScheduleTemplate>(`${this.API_URL}/save`, payload, { withCredentials: true });
  }

  update(id: number, payload: ScheduleTemplateWrite): Observable<ScheduleTemplate> {
    return this.http.put<ScheduleTemplate>(`${this.API_URL}/${id}`, payload, { withCredentials: true });
  }

  /** Never touches any generated `Schedule` row — see `ScheduleTemplate` model's own docblock. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
