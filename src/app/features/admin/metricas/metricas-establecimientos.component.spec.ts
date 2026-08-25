import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { EstablishmentMetrics, EstablishmentsMetrics } from '../../../core/models';
import { MetricasEstablecimientosComponent } from './metricas-establecimientos.component';

const URL = 'http://localhost:8080/api/metrics/establishments';

function emptyBreakdown() {
  return { byStatus: { TURN_PENDING: 0, TURN_WAITNG: 0, TURN_IN_TREATMENT: 0, TURN_TREATED: 0, TURN_CANCELLED: 0 }, total: 0 };
}

function establishmentMetrics(overrides: Partial<EstablishmentMetrics> = {}): EstablishmentMetrics {
  return {
    stablishmentId: 1,
    name: 'Sede Norte',
    servicesCount: 4,
    doctorsCount: 6,
    turns: { ...emptyBreakdown(), total: 10 },
    totalSlots: 10,
    occupiedSlots: 4,
    occupancyRate: 0.4,
    ...overrides,
  };
}

function response(establishments: EstablishmentMetrics[] = []): EstablishmentsMetrics {
  return { from: '2026-07-25', to: '2026-08-24', establishments };
}

type Fixture = ReturnType<typeof TestBed.createComponent<MetricasEstablecimientosComponent>>;

describe('MetricasEstablecimientosComponent', () => {
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
    const fixture = TestBed.createComponent(MetricasEstablecimientosComponent);
    fixture.detectChanges();
    return fixture;
  }

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

  it('renders one row per establishment with doctors, services, turns, slots and occupancy', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(response([establishmentMetrics()]));
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('tbody tr') as HTMLTableRowElement;
    expect(row.textContent).toContain('Sede Norte');
    expect(row.textContent).toContain('6');
    expect(row.textContent).toContain('4');
    expect(row.textContent).toContain('10');
    expect(row.textContent).toContain('4 / 10');
    expect(row.textContent).toContain('40.0%');
  });

  it('shows "Sin cupos" instead of "0.0%" when an establishment has zero total slots', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(
      response([establishmentMetrics({ stablishmentId: 2, name: 'Sede Sin Cupos', totalSlots: 0, occupiedSlots: 0, occupancyRate: 0 })]),
    );
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('tbody tr') as HTMLTableRowElement;
    expect(row.textContent).toContain('Sin cupos');
    expect(row.textContent).not.toContain('0.0%');
  });

  it('shows the empty state when no establishments are returned', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(response([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay establecimientos con datos en el rango seleccionado.');
  });

  it('shows an error message and stops loading when the request fails', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush({ message: 'Ocurrió un error interno en el servidor' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ocurrió un error interno en el servidor');
    expect(fixture.nativeElement.textContent).not.toContain('Cargando');
  });
});
