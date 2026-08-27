import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { cacheInterceptor } from './cache.interceptor';
import { HttpCacheService } from '../cache/http-cache.service';
import { CACHE_ENABLED, INVALIDATE_TAGS } from '../cache/cache.tokens';
import { PLATFORM_ID } from '@angular/core';

describe('cacheInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let cacheService: HttpCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        HttpCacheService,
        provideHttpClient(withInterceptors([cacheInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    cacheService = TestBed.inject(HttpCacheService);
    cacheService.invalidateAll();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should cache GET request on first call and return cached response on second call without new HTTP request', () => {
    const testUrl = '/api/patients';
    const mockData = [{ id: 1, name: 'Alice' }];

    // First GET call
    httpClient.get<any[]>(testUrl).subscribe(data => {
      expect(data).toEqual(mockData);
    });

    const req1 = httpMock.expectOne(testUrl);
    expect(req1.request.method).toBe('GET');
    req1.flush(mockData);

    // Second GET call to identical URL
    httpClient.get<any[]>(testUrl).subscribe(data => {
      expect(data).toEqual(mockData);
    });

    // No new HTTP request should be sent
    httpMock.expectNone(testUrl);
  });

  it('should not cache GET requests when CACHE_ENABLED is false', () => {
    const testUrl = '/api/patients';
    const mockData = [{ id: 1, name: 'Alice' }];

    const context = new HttpContext().set(CACHE_ENABLED, false);

    // First call
    httpClient.get<any[]>(testUrl, { context }).subscribe(data => {
      expect(data).toEqual(mockData);
    });
    const req1 = httpMock.expectOne(testUrl);
    req1.flush(mockData);

    // Second call
    httpClient.get<any[]>(testUrl, { context }).subscribe(data => {
      expect(data).toEqual(mockData);
    });
    const req2 = httpMock.expectOne(testUrl);
    req2.flush(mockData);
  });

  it('should invalidate cache when a POST mutation succeeds', () => {
    const listUrl = '/api/doctors';
    const createUrl = '/api/doctors';
    const initialList = [{ id: 1, name: 'Dr. Smith' }];
    const updatedList = [{ id: 1, name: 'Dr. Smith' }, { id: 2, name: 'Dr. House' }];

    // 1. Initial GET call (caches list)
    httpClient.get<any[]>(listUrl).subscribe(data => {
      expect(data).toEqual(initialList);
    });
    const req1 = httpMock.expectOne(listUrl);
    req1.flush(initialList);

    // 2. POST create mutation
    httpClient.post(createUrl, { name: 'Dr. House' }).subscribe();
    const mutateReq = httpMock.expectOne(createUrl);
    expect(mutateReq.request.method).toBe('POST');
    mutateReq.flush({ id: 2, name: 'Dr. House' }, { status: 201, statusText: 'Created' });

    // 3. Subsequent GET call must fetch fresh data from backend because cache was invalidated
    httpClient.get<any[]>(listUrl).subscribe(data => {
      expect(data).toEqual(updatedList);
    });
    const req2 = httpMock.expectOne(listUrl);
    req2.flush(updatedList);
  });

  it('should invalidate cache when a DELETE mutation succeeds', () => {
    const listUrl = '/api/patients';
    const deleteUrl = '/api/patients/1';

    // 1. Initial GET call
    httpClient.get<any[]>(listUrl).subscribe();
    const req1 = httpMock.expectOne(listUrl);
    req1.flush([{ id: 1 }]);

    // 2. DELETE mutation
    httpClient.delete(deleteUrl).subscribe();
    const deleteReq = httpMock.expectOne(deleteUrl);
    deleteReq.flush(null, { status: 204, statusText: 'No Content' });

    // 3. Next GET call should hit the server again
    httpClient.get<any[]>(listUrl).subscribe();
    httpMock.expectOne(listUrl);
  });
});
