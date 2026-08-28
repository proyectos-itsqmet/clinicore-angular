import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { CoveragePlan, CoveragePlanCreate, Page } from '../models';

@Injectable({ providedIn: 'root' })
export class CoveragePlanApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api/coverage-plans';

  getAll(page: number = 0, size: number = 10, insurerId?: number): Observable<Page<CoveragePlan>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (insurerId != null) {
      params = params.set('insurerId', insurerId.toString());
    }

    return this.http.get<Page<CoveragePlan>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: number): Observable<CoveragePlan> {
    return this.http.get<CoveragePlan>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  create(payload: CoveragePlanCreate): Observable<CoveragePlan> {
    return this.http.post<CoveragePlan>(`${this.API_URL}/save`, payload, { withCredentials: true });
  }

  update(id: number, payload: CoveragePlanCreate): Observable<CoveragePlan> {
    return this.http.put<CoveragePlan>(`${this.API_URL}/${id}`, payload, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
