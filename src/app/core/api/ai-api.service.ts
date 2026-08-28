import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { ClinicalSummary } from '../models';

@Injectable({ providedIn: 'root' })
export class AiApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api';

  getClinicalSummary(patientId: string): Observable<ClinicalSummary> {
    return this.http.post<ClinicalSummary>(
      `${this.API_URL}/patients/${patientId}/clinical-summary`,
      {},
      { withCredentials: true },
    );
  }
}
