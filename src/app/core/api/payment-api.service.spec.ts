import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { Payment } from '../models';
import { PaymentApiService } from './payment-api.service';

const INVOICES_URL = '/api/invoices';

function payment(id: number, overrides: Partial<Payment> = {}): Payment {
  return { id, amount: 20, method: 'CASH', paidAt: '2026-08-24T10:00:00-05:00', ...overrides };
}

describe('PaymentApiService', () => {
  let service: PaymentApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PaymentApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('create POSTs to /api/invoices/{invoiceId}/payments with credentials', () => {
    let result: Payment | undefined;
    service.create(5, { amount: 20, method: 'CASH' }).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${INVOICES_URL}/5/payments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ amount: 20, method: 'CASH' });
    expect(req.request.withCredentials).toBe(true);

    req.flush(payment(1));
    expect(result?.id).toBe(1);
  });

  it('create forwards the server overpayment error message untouched (the caller decides how to surface it)', () => {
    let error: { error?: { message?: string } } | undefined;
    service.create(5, { amount: 999, method: 'CASH' }).subscribe({ error: (err) => (error = err) });

    const req = httpMock.expectOne(`${INVOICES_URL}/5/payments`);
    req.flush({ message: 'El monto excede el saldo pendiente ($20.00).' }, { status: 400, statusText: 'Bad Request' });

    expect(error?.error?.message).toBe('El monto excede el saldo pendiente ($20.00).');
  });

  it('getForInvoice GETs the plain array of payments for one invoice', () => {
    let result: Payment[] | undefined;
    service.getForInvoice(5).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${INVOICES_URL}/5/payments`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    req.flush([payment(1), payment(2, { method: 'CARD' })]);
    expect(result?.length).toBe(2);
  });
});
