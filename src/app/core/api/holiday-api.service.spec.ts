import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { Holiday, Page } from '../models';
import { HolidayApiService } from './holiday-api.service';

const API_URL = 'http://localhost:8080/api/holidays';

function holiday(id: number, overrides: Partial<Holiday> = {}): Holiday {
  return {
    id,
    date: '2026-12-25',
    description: 'Navidad',
    reason: { id: 1, description: 'Feriado nacional' },
    createdAt: '2026-08-24T10:00:00Z',
    ...overrides,
  };
}

function page(content: Holiday[]): Page<Holiday> {
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

describe('HolidayApiService', () => {
  let service: HolidayApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(HolidayApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll requests page/size and omits stablishmentId when not provided', () => {
    service.getAll(0, 10).subscribe();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.has('stablishmentId')).toBe(false);
    expect(req.request.withCredentials).toBe(true);

    req.flush(page([holiday(1)]));
  });

  it('getAll sends stablishmentId when filtering by establishment', () => {
    service.getAll(0, 10, 3).subscribe();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('stablishmentId')).toBe('3');

    req.flush(page([]));
  });

  it('getById GETs /api/holidays/{id} with credentials', () => {
    let result: Holiday | undefined;
    service.getById(7).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/7`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    req.flush(holiday(7));
    expect(result?.id).toBe(7);
  });

  it('create POSTs to /save and surfaces conflictingScheduleIds from the response', () => {
    let result: Holiday | undefined;
    service
      .create({ date: '2026-12-25', description: 'Navidad', reason: { id: 1 } })
      .subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/save`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ date: '2026-12-25', description: 'Navidad', reason: { id: 1 } });
    expect(req.request.withCredentials).toBe(true);

    req.flush(holiday(1, { conflictingScheduleIds: [42, 43] }));
    expect(result?.conflictingScheduleIds).toEqual([42, 43]);
  });

  it('create sends stablishment: null for a global holiday', () => {
    service
      .create({ date: '2026-12-25', description: 'Navidad', reason: { id: 1 }, stablishment: null })
      .subscribe();

    const req = httpMock.expectOne(`${API_URL}/save`);
    expect(req.request.body.stablishment).toBeNull();

    req.flush(holiday(1));
  });

  it('update PUTs to /{id} with the payload and credentials', () => {
    service.update(4, { date: '2026-12-25', description: 'Navidad', reason: { id: 1 } }).subscribe();

    const req = httpMock.expectOne(`${API_URL}/4`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.withCredentials).toBe(true);

    req.flush(holiday(4));
  });

  it('delete DELETEs /{id} with credentials', () => {
    service.delete(8).subscribe();

    const req = httpMock.expectOne(`${API_URL}/8`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBe(true);

    req.flush(null);
  });
});
