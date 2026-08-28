import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { ClinicalAccessLog, Page } from '../models';

@Injectable({ providedIn: 'root' })
export class ClinicalAccessLogApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api/clinical-access-logs';

  getAll(
    patientId?: string,
    page: number = 0,
    size: number = 10,
  ): Observable<Page<ClinicalAccessLog>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (patientId && patientId.trim()) {
      params = params.set('patientId', patientId.trim());
    }

    return this.http.get<Page<ClinicalAccessLog>>(this.API_URL, { params, withCredentials: true });
  }
}
