import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { CoveragePlan, Insurer, Page } from '../models';
import { CoveragePlanApiService } from './coverage-plan-api.service';

const API_URL = 'http://localhost:8080/api/coverage-plans';

function insurer(id: number): Insurer {
  return { id, name: `Aseguradora ${id}`, type: 'INSURER_PRIVATE' };
}

function plan(id: number, overrides: Partial<CoveragePlan> = {}): CoveragePlan {
  return {
    id,
    insurer: insurer(1),
    name: `Plan ${id}`,
    coveragePercentage: 80,
    copayAmount: null,
    createdAt: '2026-08-24T10:00:00Z',
    ...overrides,
  };
}

function page(content: CoveragePlan[]): Page<CoveragePlan> {
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

describe('CoveragePlanApiService', () => {
  let service: CoveragePlanApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CoveragePlanApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll requests page/size and omits insurerId when not provided', () => {
    service.getAll(0, 10).subscribe();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.has('insurerId')).toBe(false);
    expect(req.request.withCredentials).toBe(true);

    req.flush(page([plan(1)]));
  });

  it('getAll sends insurerId when filtering by insurer', () => {
    service.getAll(0, 10, 3).subscribe();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('insurerId')).toBe('3');

    req.flush(page([]));
  });

  it('create POSTs the insurer/name/coveragePercentage/copayAmount payload to /save', () => {
    service
      .create({ insurer: { id: 1 }, name: 'Plan Oro', coveragePercentage: 0, copayAmount: 10 })
      .subscribe();

    const req = httpMock.expectOne(`${API_URL}/save`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ insurer: { id: 1 }, name: 'Plan Oro', coveragePercentage: 0, copayAmount: 10 });
    expect(req.request.withCredentials).toBe(true);

    req.flush(plan(1, { name: 'Plan Oro', coveragePercentage: 0, copayAmount: 10 }));
  });

  it('update PUTs to /{id} with the payload and credentials', () => {
    service.update(4, { insurer: { id: 1 }, name: 'Plan Oro', coveragePercentage: 80, copayAmount: null }).subscribe();

    const req = httpMock.expectOne(`${API_URL}/4`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.withCredentials).toBe(true);

    req.flush(plan(4));
  });

  it('delete DELETEs /{id} with credentials', () => {
    service.delete(9).subscribe();

    const req = httpMock.expectOne(`${API_URL}/9`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBe(true);

    req.flush(null);
  });
});
