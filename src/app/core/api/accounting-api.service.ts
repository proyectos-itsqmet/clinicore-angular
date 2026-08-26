import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { AccountingSummary, ClaimsSummary } from '../models';

/**
 * `AccountingController` (Backend_QMS), `@RequestMapping("/api/accounting")`.
 * Read-only reporting over Invoice/Payment/Claim — no new table. `from`/`to`
 * are plain `LocalDate` (`ISO.DATE`, i.e. `YYYY-MM-DD`) query params, exactly
 * like a native `<input type="date">` value — never build a `Date` object
 * for them.
 */
@Injectable({ providedIn: 'root' })
export class AccountingApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api/accounting';

  /**
   * `GET /api/accounting/summary`. `invoicedByStatus`/`collectedByMethod` are
   * bounded by `[from, to]`; `outstandingNow` on the response is
   * deliberately NOT bounded by them — it is always "right now".
   */
  getSummary(from?: string, to?: string): Observable<AccountingSummary> {
    let params = new HttpParams();
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    return this.http.get<AccountingSummary>(`${this.API_URL}/summary`, { params, withCredentials: true });
  }

  /** `GET /api/accounting/claims-summary` — bounded by `submittedAt` within `[from, to]`. */
  getClaimsSummary(from?: string, to?: string): Observable<ClaimsSummary> {
    let params = new HttpParams();
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    return this.http.get<ClaimsSummary>(`${this.API_URL}/claims-summary`, { params, withCredentials: true });
  }
}
