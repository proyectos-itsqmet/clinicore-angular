import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Page, Turn, TurnFilterParams } from '../models';

@Injectable({ providedIn: 'root' })
export class TurnApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/turns';

  getTurnsByPatient(patientId: string, filterParams: TurnFilterParams = {}): Observable<Page<Turn>> {
    let params = new HttpParams()
      .set('page', (filterParams.page ?? 0).toString())
      .set('size', (filterParams.size ?? 10).toString());

    if (filterParams.status && filterParams.status.trim()) {
      params = params.set('status', filterParams.status.trim());
    }

    if (filterParams.from && filterParams.from.trim()) {
      params = params.set('from', filterParams.from.trim());
    }

    if (filterParams.to && filterParams.to.trim()) {
      params = params.set('to', filterParams.to.trim());
    }

    if (filterParams.sort && filterParams.sort.trim()) {
      params = params.set('sort', filterParams.sort.trim());
    }

    return this.http.get<Page<Turn>>(`${this.API_URL}/patient/${patientId}`, {
      params,
      withCredentials: true
    });
  }

  createByStaff(payload: { schedule: { id: number }; patient: { uuid: string } }): Observable<Turn> {
    return this.http.post<Turn>(`${this.API_URL}/staff`, payload, { withCredentials: true });
  }
}
