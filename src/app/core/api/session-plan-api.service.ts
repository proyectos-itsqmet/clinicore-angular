import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Page, SessionPlan, SessionPlanCreate } from '../models';

/** `GET/POST/PUT/DELETE /api/session-plans` — "precios/sesiones". GET (bare list) is public; writes require ROLE_ADMIN (GlobalConfig). */
@Injectable({ providedIn: 'root' })
export class SessionPlanApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api/session-plans';

  getAll(page: number = 0, size: number = 10, servicioId?: number): Observable<Page<SessionPlan>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (servicioId != null) {
      params = params.set('servicioId', servicioId.toString());
    }

    return this.http.get<Page<SessionPlan>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: number): Observable<SessionPlan> {
    return this.http.get<SessionPlan>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  create(payload: SessionPlanCreate): Observable<SessionPlan> {
    return this.http.post<SessionPlan>(`${this.API_URL}/save`, payload, { withCredentials: true });
  }

  update(id: number, payload: SessionPlanCreate): Observable<SessionPlan> {
    return this.http.put<SessionPlan>(`${this.API_URL}/${id}`, payload, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
