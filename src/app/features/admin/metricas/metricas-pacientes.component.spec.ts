import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { PatientsMetrics } from '../../../core/models';
import { MetricasPacientesComponent } from './metricas-pacientes.component';

const URL = '/api/metrics/patients';

function response(overrides: Partial<PatientsMetrics> = {}): PatientsMetrics {
  return {
    from: '2026-07-25',
    to: '2026-08-24',
    newPatients: 0,
    turnsInPeriod: 0,
    cancelledInPeriod: 0,
    cancellationRate: 0,
    ...overrides,
  };
}

type Fixture = ReturnType<typeof TestBed.createComponent<MetricasPacientesComponent>>;

describe('MetricasPacientesComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function create(): Fixture {
    const fixture = TestBed.createComponent(MetricasPacientesComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows a loading state before the metrics resolve', () => {
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Cargando métricas de pacientes');
    httpMock.expectOne((r) => r.url === URL).flush(response());
  });

  it('omits from/to on the first request', () => {
    create();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.has('from')).toBe(false);
    expect(req.request.params.has('to')).toBe(false);
    req.flush(response());
  });

  it('reaches the request with an updated date range', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(response());
    fixture.detectChanges();

    const dateInputs = fixture.nativeElement.querySelectorAll('input[type="date"]') as NodeListOf<HTMLInputElement>;
    dateInputs[0].value = '2026-08-01';
    dateInputs[0].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('from')).toBe('2026-08-01');
    req.flush(response());
  });

  it('renders newPatients, turnsInPeriod, cancelledInPeriod and a formatted cancellation rate', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(response({ newPatients: 7, turnsInPeriod: 10, cancelledInPeriod: 2, cancellationRate: 0.2 }));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('7');
    expect(text).toContain('10');
    expect(text).toContain('2');
    expect(text).toContain('20.0%');
  });

  it('shows an explicit "sin turnos" note instead of "0.0%" when turnsInPeriod is zero', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(response({ turnsInPeriod: 0, cancellationRate: 0 }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sin turnos en el período');
    expect(fixture.nativeElement.textContent).not.toContain('0.0%');
  });

  it('shows an error message and stops loading when the request fails', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush({ message: 'Ocurrió un error interno en el servidor' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ocurrió un error interno en el servidor');
    expect(fixture.nativeElement.textContent).not.toContain('Cargando');
  });
});
