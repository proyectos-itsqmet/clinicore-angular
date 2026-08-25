import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ClinicalAccessLogApiService } from './clinical-access-log-api.service';

const URL = 'http://localhost:8080/api/clinical-access-logs';

describe('ClinicalAccessLogApiService', () => {
  let service: ClinicalAccessLogApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClinicalAccessLogApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('omits patientId from the request when not provided', () => {
    service.getAll(undefined, 0, 10).subscribe();

    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.has('patientId')).toBe(false);
    req.flush({ content: [] });
  });

  it('sends patientId as a request param when provided', () => {
    service.getAll('patient-uuid-1', 0, 10).subscribe();

    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('patientId')).toBe('patient-uuid-1');
    req.flush({ content: [] });
  });

  it('sends page/size params', () => {
    service.getAll(undefined, 2, 20).subscribe();

    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('20');
    req.flush({ content: [] });
  });
});
