import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Claim, ClaimStatus, Page } from '../models';

/**
 * `ClaimController` (Backend_QMS), `@RequestMapping("/api/claims")`. Every
 * route is staff-only (ROLE_EMPLOYEE or ROLE_ADMIN) — there is no
 * patient-facing "/me" for claims. A rejection is terminal for that claim
 * (no reopening) and does NOT touch the originating invoice's total/balance.
 */
@Injectable({ providedIn: 'root' })
export class ClaimApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/claims';

  /** `POST /api/claims` — only `invoiceId` is client-supplied; insurerName/planName/amountClaimed are derived server-side from the invoice's own line snapshots. */
  create(invoiceId: number): Observable<Claim> {
    return this.http.post<Claim>(this.API_URL, { invoiceId }, { withCredentials: true });
  }

  /** `GET /api/claims` — browse/search, optionally scoped by invoice id and/or status. */
  search(page: number = 0, size: number = 10, invoiceId?: number, status?: ClaimStatus): Observable<Page<Claim>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (invoiceId != null) {
      params = params.set('invoiceId', invoiceId.toString());
    }
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<Page<Claim>>(this.API_URL, { params, withCredentials: true });
  }

  /** `GET /api/claims/{id}`. */
  getById(id: number): Observable<Claim> {
    return this.http.get<Claim>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  /** `PUT /api/claims/{id}/accept`. */
  accept(id: number): Observable<Claim> {
    return this.http.put<Claim>(`${this.API_URL}/${id}/accept`, {}, { withCredentials: true });
  }

  /** `PUT /api/claims/{id}/reject` — a reason is mandatory. */
  reject(id: number, reason: string): Observable<Claim> {
    return this.http.put<Claim>(`${this.API_URL}/${id}/reject`, { reason }, { withCredentials: true });
  }

  /** `PUT /api/claims/{id}/mark-paid` — only reachable from ACCEPTED; creates the settlement Payment server-side. */
  markAsPaid(id: number): Observable<Claim> {
    return this.http.put<Claim>(`${this.API_URL}/${id}/mark-paid`, {}, { withCredentials: true });
  }
}
