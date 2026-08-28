import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { AccountingSummary, ClaimsSummary } from '../models';
import { AccountingApiService } from './accounting-api.service';

const API_URL = '/api/accounting';

function summary(overrides: Partial<AccountingSummary> = {}): AccountingSummary {
  return {
    from: '2026-08-01',
    to: '2026-08-24',
    invoicedByStatus: [{ status: 'ISSUED', count: 3, totalAmount: 150 }],
    collectedByMethod: [{ method: 'CASH', count: 2, totalAmount: 100 }],
    outstandingNow: 500,
    ...overrides,
  };
}

describe('AccountingApiService', () => {
  let service: AccountingApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AccountingApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getSummary GETs /api/accounting/summary with from/to as plain LocalDate strings', () => {
    let result: AccountingSummary | undefined;
    service.getSummary('2026-08-01', '2026-08-24').subscribe((res) => (result = res));

    const req = httpMock.expectOne((r) => r.url === `${API_URL}/summary`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('from')).toBe('2026-08-01');
    expect(req.request.params.get('to')).toBe('2026-08-24');
    expect(req.request.withCredentials).toBe(true);

    req.flush(summary());

    expect(result?.outstandingNow).toBe(500);
  });

  it('getSummary omits from/to when not provided (no default range silently applied)', () => {
    service.getSummary().subscribe();

    const req = httpMock.expectOne((r) => r.url === `${API_URL}/summary`);
    expect(req.request.params.has('from')).toBe(false);
    expect(req.request.params.has('to')).toBe(false);

    req.flush(summary({ from: undefined, to: undefined }));
  });

  it('getClaimsSummary GETs /api/accounting/claims-summary with from/to', () => {
    let result: ClaimsSummary | undefined;
    service.getClaimsSummary('2026-08-01', '2026-08-24').subscribe((res) => (result = res));

    const req = httpMock.expectOne((r) => r.url === `${API_URL}/claims-summary`);
    expect(req.request.params.get('from')).toBe('2026-08-01');

    req.flush({
      from: '2026-08-01',
      to: '2026-08-24',
      claimsByStatus: [{ status: 'SUBMITTED', count: 1, totalAmount: 30 }],
    });
    expect(result?.claimsByStatus[0].status).toBe('SUBMITTED');
  });
});
