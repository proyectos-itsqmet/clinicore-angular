import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Page, TimeOff, TimeOffCreate, TimeOffKind } from '../models';

@Injectable({ providedIn: 'root' })
export class TimeOffApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/time-offs';

  getAll(
    page: number = 0,
    size: number = 10,
    filters: { doctorId?: string; kind?: TimeOffKind } = {},
  ): Observable<Page<TimeOff>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (filters.doctorId && filters.doctorId.trim()) {
      params = params.set('doctorId', filters.doctorId.trim());
    }

    if (filters.kind) {
      params = params.set('kind', filters.kind);
    }

    return this.http.get<Page<TimeOff>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: number): Observable<TimeOff> {
    return this.http.get<TimeOff>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  create(payload: TimeOffCreate): Observable<TimeOff> {
    return this.http.post<TimeOff>(`${this.API_URL}/save`, payload, { withCredentials: true });
  }

  update(id: number, payload: TimeOffCreate): Observable<TimeOff> {
    return this.http.put<TimeOff>(`${this.API_URL}/${id}`, payload, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
