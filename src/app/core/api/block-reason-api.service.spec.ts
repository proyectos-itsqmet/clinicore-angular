import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { BlockReason, Page } from '../models';
import { BlockReasonApiService } from './block-reason-api.service';

const API_URL = 'http://localhost:8080/api/block-reasons';

function blockReason(id: number, description = `Motivo ${id}`): BlockReason {
  return { id, description };
}

function page(content: BlockReason[]): Page<BlockReason> {
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

describe('BlockReasonApiService', () => {
  let service: BlockReasonApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(BlockReasonApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll requests page/size and omits description when empty', () => {
    service.getAll(0, 10).subscribe();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.has('description')).toBe(false);
    expect(req.request.withCredentials).toBe(true);

    req.flush(page([blockReason(1)]));
  });

  it('getAll sends a trimmed description filter when provided', () => {
    service.getAll(0, 10, '  Feriado  ').subscribe();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('description')).toBe('Feriado');

    req.flush(page([]));
  });

  it('getById GETs /api/block-reasons/{id} with credentials', () => {
    let result: BlockReason | undefined;
    service.getById(5).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/5`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    req.flush(blockReason(5));
    expect(result?.id).toBe(5);
  });

  it('create POSTs to /save with the payload and credentials', () => {
    let result: BlockReason | undefined;
    service.create({ description: 'Feriado nacional' }).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/save`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ description: 'Feriado nacional' });
    expect(req.request.withCredentials).toBe(true);

    req.flush(blockReason(1, 'Feriado nacional'));
    expect(result?.description).toBe('Feriado nacional');
  });

  it('update PUTs to /{id} with the payload and credentials', () => {
    service.update(3, { description: 'Actualizado' }).subscribe();

    const req = httpMock.expectOne(`${API_URL}/3`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ description: 'Actualizado' });
    expect(req.request.withCredentials).toBe(true);

    req.flush(blockReason(3, 'Actualizado'));
  });

  it('delete DELETEs /{id} with credentials', () => {
    service.delete(9).subscribe();

    const req = httpMock.expectOne(`${API_URL}/9`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBe(true);

    req.flush(null);
  });
});
