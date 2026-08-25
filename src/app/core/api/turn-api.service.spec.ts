import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { Turn } from '../models';
import { TurnApiService } from './turn-api.service';

const API_URL = 'http://localhost:8080/api/turns';

function turn(id: number, overrides: Partial<Turn> = {}): Turn {
  return {
    id,
    order: 1,
    status: 'TURN_WAITNG',
    createdAt: '2026-08-24T10:00:00Z',
    ...overrides,
  };
}

describe('TurnApiService', () => {
  let service: TurnApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TurnApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Check-in: PUT /api/turns/{id}/waiting, mirrors markAsTreated's contract. */
  it('markAsWaiting PUTs to /waiting with an empty body and credentials, and returns the updated turn', () => {
    let result: Turn | undefined;

    service.markAsWaiting(7).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/7/waiting`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});
    expect(req.request.withCredentials).toBe(true);

    req.flush(turn(7, { status: 'TURN_WAITNG' }));

    expect(result?.status).toBe('TURN_WAITNG');
  });

  /** Start attention: PUT /api/turns/{id}/in-treatment. */
  it('markAsInTreatment PUTs to /in-treatment with an empty body and credentials, and returns the updated turn', () => {
    let result: Turn | undefined;

    service.markAsInTreatment(9).subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/9/in-treatment`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});
    expect(req.request.withCredentials).toBe(true);

    req.flush(turn(9, { status: 'TURN_IN_TREATMENT' }));

    expect(result?.status).toBe('TURN_IN_TREATMENT');
  });
});
