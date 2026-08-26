import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { CoveragePlan, PatientCoverage } from '../models';
import { PatientCoverageApiService } from './patient-coverage-api.service';

const PATIENT_ID = 'patient-uuid-1';
const PATIENTS_URL = `/api/patients/${PATIENT_ID}/coverages`;
const API_URL = '/api/patient-coverages';

function plan(): CoveragePlan {
  return { id: 1, insurer: { id: 1, name: 'IESS', type: 'INSURER_PUBLIC' }, name: 'Plan Base', coveragePercentage: 80 };
}

function coverage(id: number, overrides: Partial<PatientCoverage> = {}): PatientCoverage {
  return {
    id,
    patient: { uuid: PATIENT_ID, firstName: 'Ana', lastName: 'Lopez' },
    plan: plan(),
    policyNumber: 'POL-1',
    validFrom: '2026-01-01',
    active: true,
    ...overrides,
  };
}

describe('PatientCoverageApiService', () => {
  let service: PatientCoverageApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PatientCoverageApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getForPatient GETs /api/patients/{patientId}/coverages with credentials', () => {
    let result: PatientCoverage[] | undefined;
    service.getForPatient(PATIENT_ID).subscribe((res) => (result = res));

    const req = httpMock.expectOne(PATIENTS_URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    req.flush([coverage(1)]);
    expect(result?.length).toBe(1);
  });

  it('create POSTs to /api/patient-coverages with NO /save suffix', () => {
    service
      .create({ patient: { uuid: PATIENT_ID }, plan: { id: 1 }, policyNumber: 'POL-1', validFrom: '2026-01-01', active: true })
      .subscribe();

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      patient: { uuid: PATIENT_ID },
      plan: { id: 1 },
      policyNumber: 'POL-1',
      validFrom: '2026-01-01',
      active: true,
    });
    expect(req.request.withCredentials).toBe(true);

    req.flush(coverage(1));
  });

  it('update PUTs to /api/patient-coverages/{id}', () => {
    service
      .update(5, { patient: { uuid: PATIENT_ID }, plan: { id: 1 }, policyNumber: 'POL-1', validFrom: '2026-01-01', active: false })
      .subscribe();

    const req = httpMock.expectOne(`${API_URL}/5`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.withCredentials).toBe(true);

    req.flush(coverage(5, { active: false }));
  });

  it('delete DELETEs /api/patient-coverages/{id}', () => {
    service.delete(5).subscribe();

    const req = httpMock.expectOne(`${API_URL}/5`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBe(true);

    req.flush(null);
  });
});
