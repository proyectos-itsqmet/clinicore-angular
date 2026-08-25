import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { Page, TimeOff } from '../models';
import { TimeOffApiService } from './time-off-api.service';

const API_URL = 'http://localhost:8080/api/time-offs';

function timeOff(id: number, overrides: Partial<TimeOff> = {}): TimeOff {
  return {
    id,
    doctor: { uuid: 'doc-1', firstName: 'Ana', lastName: 'Lopez' },
    kind: 'KIND_VACATION',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    reason: { id: 2, description: 'Vacaciones anuales' },
    createdAt: '2026-08-24T10:00:00Z',
    ...overrides,
  };
}

function page(content: TimeOff[]): Page<TimeOff> {
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

describe('TimeOffApiService', () => {
  let service: TimeOffApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TimeOffApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll requests page/size and omits doctorId/kind when not provided', () => {
    service.getAll(0, 10).subscribe();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.has('doctorId')).toBe(false);
    expect(req.request.params.has('kind')).toBe(false);
    expect(req.request.withCredentials).toBe(true);

    req.flush(page([timeOff(1)]));
  });

  it('getAll sends doctorId and kind when filtering', () => {
    service.getAll(0, 10, { doctorId: 'doc-1', kind: 'KIND_PERMISSION' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('doctorId')).toBe('doc-1');
    expect(req.request.params.get('kind')).toBe('KIND_PERMISSION');

    req.flush(page([]));
  });

  it('getById GETs /api/time-offs/{id} with credentials', () => {
    let result: TimeOff | undefined;
    service.getById(6).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/6`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    req.flush(timeOff(6));
    expect(result?.id).toBe(6);
  });

  it('create POSTs to /save and surfaces conflictingScheduleIds from the response', () => {
    let result: TimeOff | undefined;
    service
      .create({
        doctor: { uuid: 'doc-1' },
        kind: 'KIND_VACATION',
        startDate: '2026-09-01',
        endDate: '2026-09-05',
        reason: { id: 2 },
      })
      .subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/save`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);

    req.flush(timeOff(1, { conflictingScheduleIds: [11] }));
    expect(result?.conflictingScheduleIds).toEqual([11]);
  });

  it('update PUTs to /{id} with the payload and credentials', () => {
    service
      .update(5, {
        doctor: { uuid: 'doc-1' },
        kind: 'KIND_VACATION',
        startDate: '2026-09-01',
        endDate: '2026-09-05',
        reason: { id: 2 },
      })
      .subscribe();

    const req = httpMock.expectOne(`${API_URL}/5`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.withCredentials).toBe(true);

    req.flush(timeOff(5));
  });

  it('delete DELETEs /{id} with credentials', () => {
    service.delete(2).subscribe();

    const req = httpMock.expectOne(`${API_URL}/2`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBe(true);

    req.flush(null);
  });
});
