import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Payment, PaymentCreate } from '../models';

/**
 * `PaymentController` (Backend_QMS) — nested entirely under
 * "/api/invoices/{invoiceId}/payments"; there is no bare "/api/payments"
 * root, a Payment never exists independent of its Invoice. Staff-only
 * (ROLE_EMPLOYEE or ROLE_ADMIN).
 */
@Injectable({ providedIn: 'root' })
export class PaymentApiService {
  private readonly http = inject(HttpClient);
  private readonly INVOICES_URL = '/api/invoices';

  /**
   * `POST /api/invoices/{invoiceId}/payments`. Overpayment (`amount >
   * total - sum(payments)`) is rejected by the server with a 400 whose
   * message carries the current balance — surface `err.error.message`
   * verbatim to the caller, never re-derive the balance client-side.
   */
  create(invoiceId: number, payload: PaymentCreate): Observable<Payment> {
    return this.http.post<Payment>(`${this.INVOICES_URL}/${invoiceId}/payments`, payload, { withCredentials: true });
  }

  /** `GET /api/invoices/{invoiceId}/payments` — a plain array, not a `Page<T>` (a receipt list is never large enough to paginate). */
  getForInvoice(invoiceId: number): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.INVOICES_URL}/${invoiceId}/payments`, { withCredentials: true });
  }
}
