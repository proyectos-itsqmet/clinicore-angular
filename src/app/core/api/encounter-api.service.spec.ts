import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { EncounterCreate } from '../models';
import { EncounterApiService } from './encounter-api.service';

const PATIENT_ID = 'patient-uuid-1';

describe('EncounterApiService', () => {
  let service: EncounterApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EncounterApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('requests the patient-scoped history with page/size params', () => {
    service.getHistoryForPatient(PATIENT_ID, 1, 5).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `/api/patients/${PATIENT_ID}/encounters`,
    );
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('5');
    req.flush({ content: [] });
  });

  it('requests a single encounter by id', () => {
    service.getById(7).subscribe();

    const req = httpMock.expectOne('/api/encounters/7');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 7 });
  });

  it('POSTs a new encounter to /api/encounters', () => {
    const payload: EncounterCreate = {
      turnId: 42,
      reasonForVisit: 'Dolor de cabeza',
      diagnosis: 'Migraña',
    };

    service.create(payload).subscribe();

    const req = httpMock.expectOne('/api/encounters');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 1, ...payload });
  });

  it('PUTs an update that still carries turnId (server validates it as required even though it ignores it)', () => {
    const payload: EncounterCreate = {
      turnId: 42,
      reasonForVisit: 'Dolor de cabeza (actualizado)',
      diagnosis: 'Migraña',
      clinicalNotes: 'Seguimiento en 1 semana',
    };

    service.update(1, payload).subscribe();

    const req = httpMock.expectOne('/api/encounters/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.turnId).toBe(42);
    req.flush({ id: 1, ...payload });
  });
});
