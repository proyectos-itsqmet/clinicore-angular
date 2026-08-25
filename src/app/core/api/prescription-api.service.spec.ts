import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { PrescriptionCreate } from '../models';
import { PrescriptionApiService } from './prescription-api.service';

const PATIENT_ID = 'patient-uuid-1';

describe('PrescriptionApiService', () => {
  let service: PrescriptionApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PrescriptionApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('requests the patient-scoped history with page/size params', () => {
    service.getHistoryForPatient(PATIENT_ID, 0, 10).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `http://localhost:8080/api/patients/${PATIENT_ID}/prescriptions`,
    );
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    req.flush({ content: [] });
  });

  it('requests a single prescription by id', () => {
    service.getById(9).subscribe();

    const req = httpMock.expectOne('http://localhost:8080/api/prescriptions/9');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 9 });
  });

  it('POSTs a new prescription with every line item to /api/prescriptions', () => {
    const payload: PrescriptionCreate = {
      encounterId: 3,
      notes: 'Tomar con alimentos',
      items: [
        { medication: 'Ibuprofeno', dosage: '400mg', frequency: 'Cada 8 horas', duration: '5 días' },
        { medication: 'Paracetamol', dosage: '500mg', frequency: 'Cada 6 horas', duration: '3 días', instructions: 'Solo si hay fiebre' },
      ],
    };

    service.create(payload).subscribe();

    const req = httpMock.expectOne('http://localhost:8080/api/prescriptions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.body.items.length).toBe(2);
    req.flush({ id: 1, ...payload });
  });
});
