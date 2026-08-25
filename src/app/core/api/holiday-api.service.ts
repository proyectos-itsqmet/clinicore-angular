import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Holiday, HolidayCreate, Page } from '../models';

@Injectable({ providedIn: 'root' })
export class HolidayApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/holidays';

  getAll(page: number = 0, size: number = 10, stablishmentId?: number): Observable<Page<Holiday>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (stablishmentId != null) {
      params = params.set('stablishmentId', stablishmentId.toString());
    }

    return this.http.get<Page<Holiday>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: number): Observable<Holiday> {
    return this.http.get<Holiday>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  /** `payload.stablishment` omitted or `null` means "todas las sedes" (global holiday). */
  create(payload: HolidayCreate): Observable<Holiday> {
    return this.http.post<Holiday>(`${this.API_URL}/save`, payload, { withCredentials: true });
  }

  update(id: number, payload: HolidayCreate): Observable<Holiday> {
    return this.http.put<Holiday>(`${this.API_URL}/${id}`, payload, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
