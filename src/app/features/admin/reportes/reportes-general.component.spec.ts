import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { DayTurns, TurnsSeries } from '../../../core/models';
import { ReportesGeneralComponent } from './reportes-general.component';

const URL = '/api/metrics/turns';

function emptyBreakdown() {
  return { byStatus: { TURN_PENDING: 0, TURN_WAITNG: 0, TURN_IN_TREATMENT: 0, TURN_TREATED: 0, TURN_CANCELLED: 0 }, total: 0 };
}

function day(date: string, byStatus: Partial<Record<string, number>> = {}): DayTurns {
  const base = { ...emptyBreakdown().byStatus, ...byStatus };
  const total = Object.values(base).reduce((sum, value) => sum + (value ?? 0), 0);
  return { date, turns: { byStatus: base as DayTurns['turns']['byStatus'], total } };
}

function series(overrides: Partial<TurnsSeries> = {}): TurnsSeries {
  return { from: '2026-07-25', to: '2026-08-24', days: [], ...overrides };
}

type Fixture = ReturnType<typeof TestBed.createComponent<ReportesGeneralComponent>>;

describe('ReportesGeneralComponent', () => {
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
    const fixture = TestBed.createComponent(ReportesGeneralComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('omits from, to, and NEVER sends stablishmentId/serviceId — this report is system-wide by design', () => {
    create();

    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.has('from')).toBe(false);
    expect(req.request.params.has('to')).toBe(false);
    expect(req.request.params.has('stablishmentId')).toBe(false);
    expect(req.request.params.has('serviceId')).toBe(false);
    req.flush(series());
  });

  it('reaches the request with an updated date range', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(series());
    fixture.detectChanges();

    const dateInputs = fixture.nativeElement.querySelectorAll('input[type="date"]') as NodeListOf<HTMLInputElement>;
    dateInputs[0].value = '2026-08-01';
    dateInputs[0].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('from')).toBe('2026-08-01');
    req.flush(series());
  });

  it('aggregates status totals and percentages across the whole range', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(
      series({
        days: [day('2026-08-23', { TURN_TREATED: 6 }), day('2026-08-24', { TURN_TREATED: 2, TURN_CANCELLED: 2 })],
      }),
    );
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    // The chart's own legend format ("Label: total") pins down the AGGREGATE
    // unambiguously — 6 (day 1) + 2 (day 2) treated = 8, 2 cancelled.
    expect(text).toContain('Atendido: 8');
    expect(text).toContain('Cancelado: 2');
    expect(text).toContain('80.0%');
    expect(text).toContain('20.0%');
    expect(text).toContain('Total del rango: 10');
  });

  it('shows the empty state when the range has zero turns instead of a table of all-zero rows', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(series({ days: [day('2026-08-23'), day('2026-08-24')] }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay turnos registrados en el rango seleccionado.');
  });

  it('shows an error message and stops loading when the request fails', () => {
    const fixture = create();
    httpMock
      .expectOne((r) => r.url === URL)
      .flush({ message: "La fecha 'desde' no puede ser posterior a la fecha 'hasta'" }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("La fecha 'desde' no puede ser posterior a la fecha 'hasta'");
    expect(fixture.nativeElement.textContent).not.toContain('Generando');
  });
});
