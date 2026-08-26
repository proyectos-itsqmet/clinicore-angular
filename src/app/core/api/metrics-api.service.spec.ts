import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { MetricsSummary } from '../models';
import { MetricsApiService } from './metrics-api.service';

const API_URL = '/api/metrics';

function emptyBreakdown() {
  return {
    byStatus: {
      TURN_PENDING: 0,
      TURN_WAITNG: 0,
      TURN_IN_TREATMENT: 0,
      TURN_TREATED: 0,
      TURN_CANCELLED: 0,
    },
    total: 0,
  } as const;
}

describe('MetricsApiService', () => {
  let service: MetricsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(MetricsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getSummary GETs /summary with credentials and no params', () => {
    let result: MetricsSummary | undefined;

    service.getSummary().subscribe((res) => (result = res));

    const req = httpMock.expectOne(`${API_URL}/summary`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    const dto: MetricsSummary = {
      turnsToday: emptyBreakdown(),
      totalPatients: 10,
      totalDoctors: 2,
      totalOperators: 1,
      totalEstablishments: 3,
      totalServices: 5,
    };
    req.flush(dto);

    expect(result?.totalPatients).toBe(10);
  });

  it('getTurnsSeries omits from, to, stablishmentId and serviceId when not provided', () => {
    service.getTurnsSeries().subscribe();

    const req = httpMock.expectOne((r) => r.url === `${API_URL}/turns`);
    expect(req.request.params.has('from')).toBe(false);
    expect(req.request.params.has('to')).toBe(false);
    expect(req.request.params.has('stablishmentId')).toBe(false);
    expect(req.request.params.has('serviceId')).toBe(false);
    expect(req.request.withCredentials).toBe(true);
    req.flush({ from: '2026-07-25', to: '2026-08-24', days: [] });
  });

  it('getTurnsSeries forwards from, to, stablishmentId and serviceId when provided', () => {
    service.getTurnsSeries({ from: '2026-08-01', to: '2026-08-24', stablishmentId: 3, serviceId: 9 }).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${API_URL}/turns`);
    expect(req.request.params.get('from')).toBe('2026-08-01');
    expect(req.request.params.get('to')).toBe('2026-08-24');
    expect(req.request.params.get('stablishmentId')).toBe('3');
    expect(req.request.params.get('serviceId')).toBe('9');
    req.flush({ from: '2026-08-01', to: '2026-08-24', stablishmentId: 3, serviceId: 9, days: [] });
  });

  it('getTurnsSeries trims blank from/to instead of sending whitespace', () => {
    service.getTurnsSeries({ from: '   ', to: '  ' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${API_URL}/turns`);
    expect(req.request.params.has('from')).toBe(false);
    expect(req.request.params.has('to')).toBe(false);
    req.flush({ from: '2026-07-25', to: '2026-08-24', days: [] });
  });

  it('getEstablishmentMetrics GETs /establishments with from/to omitted when empty', () => {
    service.getEstablishmentMetrics().subscribe();

    const req = httpMock.expectOne((r) => r.url === `${API_URL}/establishments`);
    expect(req.request.params.has('from')).toBe(false);
    expect(req.request.params.has('to')).toBe(false);
    expect(req.request.withCredentials).toBe(true);
    req.flush({ from: '2026-07-25', to: '2026-08-24', establishments: [] });
  });

  it('getEstablishmentMetrics forwards from/to when provided', () => {
    service.getEstablishmentMetrics({ from: '2026-08-01', to: '2026-08-24' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${API_URL}/establishments`);
    expect(req.request.params.get('from')).toBe('2026-08-01');
    expect(req.request.params.get('to')).toBe('2026-08-24');
    req.flush({ from: '2026-08-01', to: '2026-08-24', establishments: [] });
  });

  it('getEmployeesMetrics GETs /employees with from/to omitted when empty', () => {
    service.getEmployeesMetrics().subscribe();

    const req = httpMock.expectOne((r) => r.url === `${API_URL}/employees`);
    expect(req.request.params.has('from')).toBe(false);
    expect(req.request.params.has('to')).toBe(false);
    expect(req.request.withCredentials).toBe(true);
    req.flush({ from: '2026-07-25', to: '2026-08-24', doctors: [], operators: [] });
  });

  it('getEmployeesMetrics forwards from/to when provided', () => {
    service.getEmployeesMetrics({ from: '2026-08-01', to: '2026-08-24' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${API_URL}/employees`);
    expect(req.request.params.get('from')).toBe('2026-08-01');
    expect(req.request.params.get('to')).toBe('2026-08-24');
    req.flush({ from: '2026-08-01', to: '2026-08-24', doctors: [], operators: [] });
  });

  it('getPatientsMetrics GETs /patients with from/to omitted when empty', () => {
    service.getPatientsMetrics().subscribe();

    const req = httpMock.expectOne((r) => r.url === `${API_URL}/patients`);
    expect(req.request.params.has('from')).toBe(false);
    expect(req.request.params.has('to')).toBe(false);
    expect(req.request.withCredentials).toBe(true);
    req.flush({ from: '2026-07-25', to: '2026-08-24', newPatients: 0, turnsInPeriod: 0, cancelledInPeriod: 0, cancellationRate: 0 });
  });

  it('getPatientsMetrics forwards from/to when provided', () => {
    service.getPatientsMetrics({ from: '2026-08-01', to: '2026-08-24' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${API_URL}/patients`);
    expect(req.request.params.get('from')).toBe('2026-08-01');
    expect(req.request.params.get('to')).toBe('2026-08-24');
    req.flush({ from: '2026-08-01', to: '2026-08-24', newPatients: 1, turnsInPeriod: 2, cancelledInPeriod: 0, cancellationRate: 0 });
  });
});
