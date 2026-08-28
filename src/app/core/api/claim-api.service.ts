import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Claim, ClaimStatus, Page } from '../models';

@Injectable({ providedIn: 'root' })
export class ClaimApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api/claims';

  create(invoiceId: number): Observable<Claim> {
    return this.http.post<Claim>(this.API_URL, { invoiceId }, { withCredentials: true });
  }

  search(
    page: number = 0,
    size: number = 10,
    invoiceId?: number,
    status?: ClaimStatus,
  ): Observable<Page<Claim>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (invoiceId != null) {
      params = params.set('invoiceId', invoiceId.toString());
    }
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<Page<Claim>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: number): Observable<Claim> {
    return this.http.get<Claim>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  accept(id: number): Observable<Claim> {
    return this.http.put<Claim>(`${this.API_URL}/${id}/accept`, {}, { withCredentials: true });
  }

  reject(id: number, reason: string): Observable<Claim> {
    return this.http.put<Claim>(
      `${this.API_URL}/${id}/reject`,
      { reason },
      { withCredentials: true },
    );
  }

  markAsPaid(id: number): Observable<Claim> {
    return this.http.put<Claim>(`${this.API_URL}/${id}/mark-paid`, {}, { withCredentials: true });
  }
}
