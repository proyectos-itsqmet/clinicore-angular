import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { Claim, Page } from '../models';
import { ClaimApiService } from './claim-api.service';

const API_URL = '/api/claims';

function claim(id: number, overrides: Partial<Claim> = {}): Claim {
  return {
    id,
    invoiceId: 5,
    insurerName: 'IESS',
    planName: 'Plan Oro',
    amountClaimed: 30,
    status: 'SUBMITTED',
    submittedAt: '2026-08-24T10:00:00-05:00',
    ...overrides,
  };
}

function page(content: Claim[]): Page<Claim> {
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

describe('ClaimApiService', () => {
  let service: ClaimApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ClaimApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('create POSTs { invoiceId } to /api/claims — everything else is server-derived', () => {
    service.create(5).subscribe();

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ invoiceId: 5 });
    expect(req.request.withCredentials).toBe(true);

    req.flush(claim(1));
  });

  it('search sends page/size and omits invoiceId/status when not provided', () => {
    service.search(0, 10).subscribe();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.has('invoiceId')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);

    req.flush(page([claim(1)]));
  });

  it('search sends invoiceId and status when filtering', () => {
    service.search(0, 10, 5, 'REJECTED').subscribe();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('invoiceId')).toBe('5');
    expect(req.request.params.get('status')).toBe('REJECTED');

    req.flush(page([]));
  });

  it('getById GETs /api/claims/{id}', () => {
    service.getById(3).subscribe();
    const req = httpMock.expectOne(`${API_URL}/3`);
    expect(req.request.method).toBe('GET');
    req.flush(claim(3));
  });

  it('accept PUTs /api/claims/{id}/accept with no body payload required', () => {
    let result: Claim | undefined;
    service.accept(3).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/3/accept`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.withCredentials).toBe(true);

    req.flush(claim(3, { status: 'ACCEPTED' }));
    expect(result?.status).toBe('ACCEPTED');
  });

  it('reject PUTs the reason body to /api/claims/{id}/reject', () => {
    let result: Claim | undefined;
    service.reject(3, 'Cobertura vencida').subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/3/reject`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ reason: 'Cobertura vencida' });

    req.flush(claim(3, { status: 'REJECTED', rejectionReason: 'Cobertura vencida' }));
    expect(result?.status).toBe('REJECTED');
  });

  it('markAsPaid PUTs /api/claims/{id}/mark-paid', () => {
    let result: Claim | undefined;
    service.markAsPaid(3).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/3/mark-paid`);
    expect(req.request.method).toBe('PUT');

    req.flush(claim(3, { status: 'PAID' }));
    expect(result?.status).toBe('PAID');
  });
});
