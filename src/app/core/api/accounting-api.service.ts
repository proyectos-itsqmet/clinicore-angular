import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { AccountingSummary, ClaimsSummary } from '../models';

@Injectable({ providedIn: 'root' })
export class AccountingApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api/accounting';

  getSummary(from?: string, to?: string): Observable<AccountingSummary> {
    let params = new HttpParams();
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    return this.http.get<AccountingSummary>(`${this.API_URL}/summary`, {
      params,
      withCredentials: true,
    });
  }

  getClaimsSummary(from?: string, to?: string): Observable<ClaimsSummary> {
    let params = new HttpParams();
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    return this.http.get<ClaimsSummary>(`${this.API_URL}/claims-summary`, {
      params,
      withCredentials: true,
    });
  }
}
