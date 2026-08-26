import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { Establishment, Page, Servicio, TurnsSeries } from '../../../core/models';
import { DashboardAnalyticsComponent } from './dashboard-analytics.component';

const TURNS_SERIES_URL = '/api/metrics/turns';
const ESTABLISHMENTS_URL = '/api/stablishments';
const SERVICES_URL = '/api/services';

function establishment(id: number): Establishment {
  return { id, name: `Sede ${id}`, address: `Dirección ${id}` };
}

function servicio(id: number): Servicio {
  return { id, name: `Servicio ${id}`, price: 20 };
}

function page<T>(content: T[]): Page<T> {
  return {
    content,
    empty: content.length === 0,
    first: true,
    last: true,
    number: 0,
    numberOfElements: content.length,
    size: 100,
    totalElements: content.length,
    totalPages: 1,
    pageable: {
      offset: 0,
      pageNumber: 0,
      pageSize: 100,
      paged: true,
      unpaged: false,
      sort: { empty: true, sorted: false, unsorted: true },
    },
    sort: { empty: true, sorted: false, unsorted: true },
  };
}

function emptyBreakdown() {
  return { byStatus: { TURN_PENDING: 0, TURN_WAITNG: 0, TURN_IN_TREATMENT: 0, TURN_TREATED: 0, TURN_CANCELLED: 0 }, total: 0 };
}

function series(overrides: Partial<TurnsSeries> = {}): TurnsSeries {
  return { from: '2026-07-25', to: '2026-08-24', days: [], ...overrides };
}

type Fixture = ReturnType<typeof TestBed.createComponent<DashboardAnalyticsComponent>>;

describe('DashboardAnalyticsComponent', () => {
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

  function create(catalogs: { establishments?: Establishment[]; services?: Servicio[] } = {}): Fixture {
    const fixture = TestBed.createComponent(DashboardAnalyticsComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === ESTABLISHMENTS_URL).flush(page(catalogs.establishments ?? []));
    httpMock.expectOne((r) => r.url === SERVICES_URL).flush(page(catalogs.services ?? []));

    return fixture;
  }

  it('omits from, to, establishment and service on the first request, letting the server default apply', () => {
    create();

    const req = httpMock.expectOne((r) => r.url === TURNS_SERIES_URL);
    expect(req.request.params.has('from')).toBe(false);
    expect(req.request.params.has('to')).toBe(false);
    expect(req.request.params.has('stablishmentId')).toBe(false);
    expect(req.request.params.has('serviceId')).toBe(false);
    req.flush(series());
  });

  it('shows the range the SERVER resolved, read from the response, not guessed client-side', () => {
    const fixture = create();

    httpMock.expectOne((r) => r.url === TURNS_SERIES_URL).flush(series({ from: '2026-07-25', to: '2026-08-24' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Rango resuelto: 2026-07-25 → 2026-08-24');
  });

  it('reaches the request with the selected establishment and service filters', () => {
    const fixture = create({ establishments: [establishment(3)], services: [servicio(9)] });
    httpMock.expectOne((r) => r.url === TURNS_SERIES_URL).flush(series());
    fixture.detectChanges();

    const estSelect = fixture.nativeElement.querySelector('select[name="analyticsEstablecimiento"]') as HTMLSelectElement;
    estSelect.value = '3';
    estSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    let req = httpMock.expectOne((r) => r.url === TURNS_SERIES_URL);
    expect(req.request.params.get('stablishmentId')).toBe('3');
    req.flush(series());
    fixture.detectChanges();

    const srvSelect = fixture.nativeElement.querySelector('select[name="analyticsServicio"]') as HTMLSelectElement;
    srvSelect.value = '9';
    srvSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    req = httpMock.expectOne((r) => r.url === TURNS_SERIES_URL);
    expect(req.request.params.get('serviceId')).toBe('9');
    req.flush(series());
  });

  it('reaches the request with an updated date range', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === TURNS_SERIES_URL).flush(series());
    fixture.detectChanges();

    const dateInputs = fixture.nativeElement.querySelectorAll('input[type="date"]') as NodeListOf<HTMLInputElement>;
    dateInputs[0].value = '2026-08-01';
    dateInputs[0].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === TURNS_SERIES_URL);
    expect(req.request.params.get('from')).toBe('2026-08-01');
    req.flush(series());
  });

  it('shows the chart\'s empty message when the resolved range has no days', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === TURNS_SERIES_URL).flush(series({ days: [] }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay datos de turnos para graficar');
  });

  it('shows an error message and stops loading when the request fails', () => {
    const fixture = create();
    httpMock
      .expectOne((r) => r.url === TURNS_SERIES_URL)
      .flush({ message: "La fecha 'desde' no puede ser posterior a la fecha 'hasta'" }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("La fecha 'desde' no puede ser posterior a la fecha 'hasta'");
    expect(fixture.nativeElement.textContent).not.toContain('Cargando');
  });

  it('renders turns per day once data resolves', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === TURNS_SERIES_URL).flush(
      series({
        days: [
          { date: '2026-08-23', turns: { ...emptyBreakdown(), byStatus: { ...emptyBreakdown().byStatus, TURN_TREATED: 4 }, total: 4 } },
          { date: '2026-08-24', turns: { ...emptyBreakdown(), byStatus: { ...emptyBreakdown().byStatus, TURN_CANCELLED: 2 }, total: 2 } },
        ],
      }),
    );
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Atendido: 4');
    expect(text).toContain('Cancelado: 2');
    expect(text).toContain('Total del rango: 6');
  });
});
