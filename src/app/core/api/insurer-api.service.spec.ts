import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { Insurer, Page } from '../models';
import { InsurerApiService } from './insurer-api.service';

const API_URL = '/api/insurers';

function insurer(id: number, overrides: Partial<Insurer> = {}): Insurer {
  return { id, name: `Aseguradora ${id}`, type: 'INSURER_PRIVATE', createdAt: '2026-08-24T10:00:00Z', ...overrides };
}

function page(content: Insurer[]): Page<Insurer> {
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

describe('InsurerApiService', () => {
  let service: InsurerApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(InsurerApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll requests page/size and omits name when not provided', () => {
    service.getAll(0, 10).subscribe();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.has('name')).toBe(false);
    expect(req.request.withCredentials).toBe(true);

    req.flush(page([insurer(1)]));
  });

  it('getAll sends a trimmed name filter when provided', () => {
    service.getAll(0, 10, '  Salud SA  ').subscribe();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('name')).toBe('Salud SA');

    req.flush(page([]));
  });

  it('getById GETs /api/insurers/{id} with credentials', () => {
    let result: Insurer | undefined;
    service.getById(7).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/7`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    req.flush(insurer(7));
    expect(result?.id).toBe(7);
  });

  it('create POSTs the name/type payload to /save', () => {
    service.create({ name: 'IESS', type: 'INSURER_PUBLIC' }).subscribe();

    const req = httpMock.expectOne(`${API_URL}/save`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'IESS', type: 'INSURER_PUBLIC' });
    expect(req.request.withCredentials).toBe(true);

    req.flush(insurer(1, { name: 'IESS', type: 'INSURER_PUBLIC' }));
  });

  it('update PUTs to /{id} with the payload and credentials', () => {
    service.update(4, { name: 'IESS', type: 'INSURER_PUBLIC' }).subscribe();

    const req = httpMock.expectOne(`${API_URL}/4`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.withCredentials).toBe(true);

    req.flush(insurer(4));
  });

  it('delete DELETEs /{id} with credentials', () => {
    service.delete(8).subscribe();

    const req = httpMock.expectOne(`${API_URL}/8`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBe(true);

    req.flush(null);
  });
});
