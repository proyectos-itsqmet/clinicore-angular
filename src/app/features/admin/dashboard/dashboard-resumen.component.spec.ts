import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { MetricsSummary } from '../../../core/models';
import { DashboardResumenComponent } from './dashboard-resumen.component';

const SUMMARY_URL = 'http://localhost:8080/api/metrics/summary';

function summary(overrides: Partial<MetricsSummary> = {}): MetricsSummary {
  return {
    turnsToday: {
      byStatus: { TURN_PENDING: 0, TURN_WAITNG: 0, TURN_IN_TREATMENT: 0, TURN_TREATED: 0, TURN_CANCELLED: 0 },
      total: 0,
    },
    totalPatients: 0,
    totalDoctors: 0,
    totalOperators: 0,
    totalEstablishments: 0,
    totalServices: 0,
    ...overrides,
  };
}

type Fixture = ReturnType<typeof TestBed.createComponent<DashboardResumenComponent>>;

describe('DashboardResumenComponent', () => {
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
    const fixture = TestBed.createComponent(DashboardResumenComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows a loading state before the summary resolves', () => {
    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain('Cargando resumen');
    httpMock.expectOne(SUMMARY_URL).flush(summary());
  });

  it('renders the five catalog totals and today\'s turn breakdown by status', () => {
    const fixture = create();

    httpMock.expectOne(SUMMARY_URL).flush(
      summary({
        totalPatients: 340,
        totalDoctors: 12,
        totalOperators: 8,
        totalEstablishments: 3,
        totalServices: 15,
        turnsToday: {
          byStatus: { TURN_PENDING: 4, TURN_WAITNG: 2, TURN_IN_TREATMENT: 1, TURN_TREATED: 6, TURN_CANCELLED: 1 },
          total: 14,
        },
      }),
    );
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('340');
    expect(text).toContain('12');
    expect(text).toContain('8');
    expect(text).toContain('3');
    expect(text).toContain('15');
    expect(text).toContain('14 turnos');
    expect(text).toContain('Pendiente');
    expect(text).toContain('En Espera');
    expect(text).toContain('En Atención');
    expect(text).toContain('Atendido');
    expect(text).toContain('Cancelado');
  });

  it('shows an explicit empty note when there are zero turns today, instead of a silent 0', () => {
    const fixture = create();

    httpMock.expectOne(SUMMARY_URL).flush(summary());
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sin turnos registrados hoy todavía.');
  });

  it('shows an error message and stops loading when the request fails, reading the `message` key', () => {
    const fixture = create();

    httpMock.expectOne(SUMMARY_URL).flush({ message: 'Ocurrió un error interno en el servidor' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ocurrió un error interno en el servidor');
    expect(fixture.nativeElement.textContent).not.toContain('Cargando');
  });
});
