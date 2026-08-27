import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpResponse, HttpRequest } from '@angular/common/http';
import { HttpCacheService } from './http-cache.service';
import { PLATFORM_ID } from '@angular/core';

describe('HttpCacheService', () => {
  let service: HttpCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HttpCacheService,
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });
    service = TestBed.inject(HttpCacheService);
    service.invalidateAll();
  });

  it('should store and retrieve cached response', () => {
    const key = '/api/patients?page=0&size=10';
    const response = new HttpResponse({ body: [{ id: 1, name: 'John Doe' }], status: 200 });

    service.set(key, response, ['patients'], 10000);
    const cached = service.get(key);

    expect(cached).not.toBeNull();
    expect(cached?.body).toEqual([{ id: 1, name: 'John Doe' }]);
  });

  it('should return null when cache expires', () => {
    const key = '/api/patients/1';
    const response = new HttpResponse({ body: { id: 1 }, status: 200 });

    // Store with 0 ms TTL (expires immediately)
    service.set(key, response, ['patients'], -100);
    const cached = service.get(key);

    expect(cached).toBeNull();
  });

  it('should invalidate cache by resource tag', () => {
    const key1 = '/api/doctors?page=0';
    const key2 = '/api/patients?page=0';
    const response = new HttpResponse({ body: [], status: 200 });

    service.set(key1, response, ['doctors'], 10000);
    service.set(key2, response, ['patients'], 10000);

    expect(service.get(key1)).not.toBeNull();
    expect(service.get(key2)).not.toBeNull();

    service.invalidateTag('doctors');

    expect(service.get(key1)).toBeNull();
    expect(service.get(key2)).not.toBeNull();
  });

  it('should trigger cross-invalidation for related resources', () => {
    const turnsKey = '/api/turns/today';
    const metricsKey = '/api/metrics/summary';
    const response = new HttpResponse({ body: {}, status: 200 });

    service.set(turnsKey, response, ['turns'], 10000);
    service.set(metricsKey, response, ['metrics'], 10000);

    // Mutating turns should also invalidate metrics
    service.invalidateTag('turns');

    expect(service.get(turnsKey)).toBeNull();
    expect(service.get(metricsKey)).toBeNull();
  });

  it('should extract correct tags from URL key', () => {
    const tags1 = service.extractTagsFromKey('http://localhost:8080/api/doctors/123/services/5');
    expect(tags1).toContain('doctors');
    expect(tags1).toContain('services');

    const tags2 = service.extractTagsFromKey('/api/patient-coverages?ci=12345');
    expect(tags2).toEqual(['patient-coverages']);
  });

  it('should invalidate cache based on mutating HttpRequest', () => {
    const listKey = 'http://localhost:8080/api/doctors?page=0';
    const detailKey = 'http://localhost:8080/api/doctors/123';
    const response = new HttpResponse({ body: {}, status: 200 });

    service.set(listKey, response, ['doctors'], 10000);
    service.set(detailKey, response, ['doctors'], 10000);

    const mutateReq = new HttpRequest('PUT', 'http://localhost:8080/api/doctors/123', { name: 'Updated' });
    service.invalidateForRequest(mutateReq);

    expect(service.get(listKey)).toBeNull();
    expect(service.get(detailKey)).toBeNull();
  });
});
