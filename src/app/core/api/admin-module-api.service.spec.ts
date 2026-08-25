import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { AdminModule } from '../models';
import { AdminModuleApiService } from './admin-module-api.service';

const API_URL = 'http://localhost:8080/api/admin-modules';

function adminModule(overrides: Partial<AdminModule> = {}): AdminModule {
  return { id: 1, moduleKey: 'dashboard', label: 'Dashboard', enabled: true, ...overrides };
}

describe('AdminModuleApiService', () => {
  let service: AdminModuleApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AdminModuleApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll() GETs the bare array from /api/admin-modules with credentials (no pagination)', () => {
    let result: AdminModule[] | undefined;
    service.getAll().subscribe((res) => (result = res));

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    req.flush([adminModule(), adminModule({ id: 2, moduleKey: 'modulos', label: 'Módulos' })]);
    expect(result?.length).toBe(2);
  });

  it('setEnabled() PUTs { enabled } to /api/admin-modules/{moduleKey} with credentials', () => {
    let result: AdminModule | undefined;
    service.setEnabled('precios', false).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/precios`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ enabled: false });
    expect(req.request.withCredentials).toBe(true);

    req.flush(adminModule({ moduleKey: 'precios', label: 'Precios', enabled: false }));
    expect(result?.enabled).toBe(false);
  });
});
