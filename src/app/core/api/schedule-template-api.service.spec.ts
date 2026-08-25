import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { Page, ScheduleTemplate, ScheduleTemplateWrite } from '../models';
import { ScheduleTemplateApiService } from './schedule-template-api.service';

const API_URL = 'http://localhost:8080/api/schedule-templates';

function template(overrides: Partial<ScheduleTemplate> = {}): ScheduleTemplate {
  return {
    id: 1,
    stablishment: { id: 2, name: 'Sede Norte', address: 'Av. Siempre Viva' },
    servicio: { id: 3, name: 'Consulta General', price: 20 },
    doctor: null,
    dayOfWeek: 'MONDAY',
    startTime: '08:00:00',
    endTime: '12:00:00',
    slotIntervalMinutes: 30,
    validFrom: '2026-01-01',
    validUntil: null,
    createdAt: '2026-08-24T10:00:00Z',
    ...overrides,
  };
}

function page(content: ScheduleTemplate[]): Page<ScheduleTemplate> {
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

describe('ScheduleTemplateApiService', () => {
  let service: ScheduleTemplateApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ScheduleTemplateApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll requests page/size and omits filters when not provided', () => {
    service.getAll(0, 10).subscribe();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.has('stablishmentId')).toBe(false);
    expect(req.request.params.has('serviceId')).toBe(false);
    expect(req.request.params.has('doctorId')).toBe(false);
    expect(req.request.withCredentials).toBe(true);

    req.flush(page([template()]));
  });

  it('getAll forwards stablishmentId/serviceId/doctorId filters', () => {
    service.getAll(0, 10, { stablishmentId: 2, serviceId: 3, doctorId: 'uuid-1' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('stablishmentId')).toBe('2');
    expect(req.request.params.get('serviceId')).toBe('3');
    expect(req.request.params.get('doctorId')).toBe('uuid-1');

    req.flush(page([]));
  });

  it('getById GETs /api/schedule-templates/{id} with credentials', () => {
    let result: ScheduleTemplate | undefined;
    service.getById(7).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/7`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    req.flush(template({ id: 7 }));
    expect(result?.id).toBe(7);
  });

  it('create POSTs to /save (never bare POST) with the exact payload', () => {
    const payload: ScheduleTemplateWrite = {
      stablishment: { id: 2 },
      servicio: { id: 3 },
      dayOfWeek: 'MONDAY',
      startTime: '08:00:00',
      endTime: '12:00:00',
      slotIntervalMinutes: 30,
      validFrom: '2026-01-01',
    };
    service.create(payload).subscribe();

    const req = httpMock.expectOne(`${API_URL}/save`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.withCredentials).toBe(true);

    req.flush(template());
  });

  it('update PUTs to /{id} with the payload and credentials', () => {
    service
      .update(4, {
        stablishment: { id: 2 },
        servicio: { id: 3 },
        dayOfWeek: 'TUESDAY',
        startTime: '12:00:00',
        endTime: '16:00:00',
        slotIntervalMinutes: 20,
        validFrom: '2026-01-01',
      })
      .subscribe();

    const req = httpMock.expectOne(`${API_URL}/4`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.withCredentials).toBe(true);

    req.flush(template({ id: 4 }));
  });

  it('delete DELETEs /{id} with credentials', () => {
    service.delete(9).subscribe();

    const req = httpMock.expectOne(`${API_URL}/9`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBe(true);

    req.flush(null);
  });
});
