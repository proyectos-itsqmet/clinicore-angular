import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { Invoice, Page } from '../models';
import { InvoiceApiService } from './invoice-api.service';

const API_URL = 'http://localhost:8080/api/invoices';
const PATIENTS_URL = 'http://localhost:8080/api/patients';

function invoice(id: number, overrides: Partial<Invoice> = {}): Invoice {
  return {
    id,
    patient: { uuid: 'patient-uuid-1', email: 'p@x.com', firstName: 'Juan', lastName: 'Perez', ci: '0102030405' },
    items: [{ sourceType: 'FREE_LINE', description: 'Consulta', amount: 50 }],
    total: 50,
    balance: 50,
    status: 'ISSUED',
    issuedAt: '2026-08-24T10:00:00-05:00',
    ...overrides,
  };
}

function page(content: Invoice[]): Page<Invoice> {
  return {
    content,
    empty: content.length === 0,
    first: true,
    last: true,
    number: 0,
    numberOfElements: content.length,
    size: 10,
    totalElements: content.length,
    totalPages: 1,
    pageable: {
      offset: 0,
      pageNumber: 0,
      pageSize: 10,
      paged: true,
      unpaged: false,
      sort: { empty: true, sorted: false, unsorted: true },
    },
    sort: { empty: true, sorted: false, unsorted: true },
  };
}

describe('InvoiceApiService', () => {
  let service: InvoiceApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(InvoiceApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('create POSTs to /api/invoices with credentials', () => {
    service.create({ patient: { uuid: 'patient-uuid-1' }, items: [{ sourceType: 'FREE_LINE', description: 'Consulta', amount: 50 }] }).subscribe();

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body.items[0].amount).toBe(50);

    req.flush(invoice(1));
  });

  it('getById GETs /api/invoices/{id} with credentials', () => {
    let result: Invoice | undefined;
    service.getById(7).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/7`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    req.flush(invoice(7));
    expect(result?.id).toBe(7);
  });

  it('search sends page/size and omits patientId/status when not provided', () => {
    service.search(0, 10).subscribe();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.has('patientId')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);

    req.flush(page([invoice(1)]));
  });

  it('search sends patientId and status when filtering', () => {
    service.search(0, 10, 'patient-uuid-1', 'PARTIALLY_PAID').subscribe();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('patientId')).toBe('patient-uuid-1');
    expect(req.request.params.get('status')).toBe('PARTIALLY_PAID');

    req.flush(page([]));
  });

  it('getForPatient GETs the nested /api/patients/{patientId}/invoices route', () => {
    service.getForPatient('patient-uuid-1', 0, 10).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/patient-uuid-1/invoices`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    req.flush(page([invoice(2)]));
  });

  it('voidInvoice PUTs to /{id}/void with the reason body', () => {
    let result: Invoice | undefined;
    service.voidInvoice(9, 'Factura duplicada').subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/9/void`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ reason: 'Factura duplicada' });
    expect(req.request.withCredentials).toBe(true);

    req.flush(invoice(9, { status: 'VOID', voidReason: 'Factura duplicada' }));
    expect(result?.status).toBe('VOID');
  });
});
