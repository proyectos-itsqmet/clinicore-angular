import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { Branding, BrandingUpdate } from '../models';
import { BrandingApiService } from './branding-api.service';

const API_URL = '/api/branding';

describe('BrandingApiService', () => {
  let service: BrandingApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(BrandingApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('get() GETs /api/branding with credentials', () => {
    let result: Branding | undefined;
    service.get().subscribe((res) => (result = res));

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    req.flush({ name: 'Clínica San Rafael', primaryColor: '#1A2B3C' });
    expect(result?.name).toBe('Clínica San Rafael');
  });

  it('get() tolerates the near-empty body a fresh install returns (no invented fields)', () => {
    let result: Branding | undefined;
    service.get().subscribe((res) => (result = res));

    httpMock.expectOne(API_URL).flush({});

    expect(result).toEqual({});
  });

  it('save() PUTs the exact payload to /api/branding (no /{id}) with credentials', () => {
    const payload: BrandingUpdate = { name: 'Clínica San Rafael', primaryColor: '#1A2B3C' };
    let result: Branding | undefined;
    service.save(payload).subscribe((res) => (result = res));

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    expect(req.request.withCredentials).toBe(true);

    req.flush({ id: 1, ...payload, updatedAt: '2026-08-25T10:00:00Z' });
    expect(result?.primaryColor).toBe('#1A2B3C');
  });
});
