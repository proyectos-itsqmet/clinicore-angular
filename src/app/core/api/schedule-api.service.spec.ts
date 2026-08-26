import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { GenerateSchedulesFromTemplateRequest, ScheduleDTO } from '../models';
import { ScheduleApiService } from './schedule-api.service';

const API_URL = '/api/schedules';

/**
 * Only covers `generateSchedulesFromTemplates`, the method added for
 * "administracion/horarios" — `create`/`getAll`/`generateSchedules` predate
 * this change and have no prior spec file; retro-covering them is out of
 * scope here.
 */
describe('ScheduleApiService#generateSchedulesFromTemplates', () => {
  let service: ScheduleApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ScheduleApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('POSTs to /api/schedules/generate-from-template with the exact period body', () => {
    const body: GenerateSchedulesFromTemplateRequest = {
      stablishmentId: 2,
      serviceId: 3,
      from: '2026-09-01',
      to: '2026-09-07',
    };
    let result: ScheduleDTO[] | undefined;
    service.generateSchedulesFromTemplates(body).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/generate-from-template`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.withCredentials).toBe(true);

    req.flush([{ id: 1, date: '2026-09-01', hour: '08:00:00' }]);
    expect(result?.length).toBe(1);
  });

  it('includes doctorId only when a specific doctor (not a pool generation) was requested', () => {
    service
      .generateSchedulesFromTemplates({ stablishmentId: 2, serviceId: 3, doctorId: 'uuid-1', from: '2026-09-01', to: '2026-09-07' })
      .subscribe();

    const req = httpMock.expectOne(`${API_URL}/generate-from-template`);
    expect(req.request.body.doctorId).toBe('uuid-1');

    req.flush([]);
  });
});
