import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Invoice, InvoiceCreate, InvoiceStatus, Page } from '../models';

/**
 * `InvoiceController` (Backend_QMS) — no class-level `@RequestMapping`, spans
 * "/api/invoices/**" and the staff sub-resource
 * "/api/patients/{patientId}/invoices".
 *
 * No `delete()` method here on purpose: there is no `@DeleteMapping` on the
 * controller — an Invoice is a financial record, VOID (`voidInvoice`) is the
 * only "removal" mechanism, and it is ROLE_ADMIN only.
 */
@Injectable({ providedIn: 'root' })
export class InvoiceApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/invoices';
  private readonly PATIENTS_URL = 'http://localhost:8080/api/patients';

  /** `POST /api/invoices` (ROLE_EMPLOYEE or ROLE_ADMIN). */
  create(payload: InvoiceCreate): Observable<Invoice> {
    return this.http.post<Invoice>(this.API_URL, payload, { withCredentials: true });
  }

  /** `GET /api/invoices/{id}` — no explicit GlobalConfig matcher; per-record ownership is enforced server-side by `InvoiceAccessGuard`. */
  getById(id: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  /** `GET /api/invoices` — staff-wide browse/search, optionally scoped by patient uuid and/or status. */
  search(page: number = 0, size: number = 10, patientId?: string, status?: InvoiceStatus): Observable<Page<Invoice>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (patientId) {
      params = params.set('patientId', patientId);
    }
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<Page<Invoice>>(this.API_URL, { params, withCredentials: true });
  }

  /** `GET /api/patients/{patientId}/invoices` — the "ver facturas de este paciente" screen. */
  getForPatient(patientId: string, page: number = 0, size: number = 10): Observable<Page<Invoice>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<Page<Invoice>>(`${this.PATIENTS_URL}/${patientId}/invoices`, { params, withCredentials: true });
  }

  /** `PUT /api/invoices/{id}/void` — ROLE_ADMIN only; refused once PAID or already VOID. A reason is mandatory. */
  voidInvoice(id: number, reason: string): Observable<Invoice> {
    return this.http.put<Invoice>(`${this.API_URL}/${id}/void`, { reason }, { withCredentials: true });
  }
}
