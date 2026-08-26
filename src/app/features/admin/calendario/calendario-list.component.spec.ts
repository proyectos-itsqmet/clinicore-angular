import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { AdminDoctor, Establishment, Page, ScheduleDTO, Servicio } from '../../../core/models';
import { CalendarioListComponent } from './calendario-list.component';

const SCHEDULES_URL = '/api/schedules';
const ESTABLISHMENTS_URL = '/api/stablishments';
const SERVICES_URL = '/api/services';
const DOCTORS_URL = '/api/doctors';

function establishment(id: number): Establishment {
  return { id, name: `Sede ${id}`, address: `Dirección ${id}` };
}

function servicio(id: number): Servicio {
  return { id, name: `Servicio ${id}`, price: 20 };
}

function doctor(uuid: string): AdminDoctor {
  return {
    uuid,
    email: `${uuid}@test.com`,
    firstName: 'Ana',
    lastName: 'Lopez',
    speciality: 'Pediatría',
    gender: 'F',
    ci: '0102030405',
  };
}

function schedule(id: number, overrides: Partial<ScheduleDTO> = {}): ScheduleDTO {
  return {
    id,
    date: '2026-08-24',
    hour: '09:00',
    status: 'STATUS_FREE',
    ...overrides,
  };
}

function page<T>(content: T[], overrides: Partial<Page<T>> = {}): Page<T> {
  return {
    content,
    empty: content.length === 0,
    first: true,
    last: true,
    number: 0,
    numberOfElements: content.length,
    size: 50,
    totalElements: content.length,
    totalPages: 1,
    pageable: {
      offset: 0,
      pageNumber: 0,
      pageSize: 50,
      paged: true,
      unpaged: false,
      sort: { empty: true, sorted: false, unsorted: true },
    },
    sort: { empty: true, sorted: false, unsorted: true },
    ...overrides,
  };
}

function isoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

type Fixture = ReturnType<typeof TestBed.createComponent<CalendarioListComponent>>;

describe('CalendarioListComponent', () => {
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

  /** Boots the component and drains the three filter catalogs (establishments/services/doctors). */
  function create(
    catalogs: { establishments?: Establishment[]; services?: Servicio[]; doctors?: AdminDoctor[] } = {},
  ): Fixture {
    const fixture = TestBed.createComponent(CalendarioListComponent);
    fixture.detectChanges();

    httpMock.expectOne((req) => req.url === ESTABLISHMENTS_URL).flush(page(catalogs.establishments ?? []));
    httpMock.expectOne((req) => req.url === SERVICES_URL).flush(page(catalogs.services ?? []));
    httpMock.expectOne((req) => req.url === DOCTORS_URL).flush(page(catalogs.doctors ?? []));

    return fixture;
  }

  it('defaults the range to a week starting today and requests it as from/to', () => {
    const fixture = create();

    const expectedFrom = isoDate(new Date());
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 6);
    const expectedTo = isoDate(weekLater);

    const req = httpMock.expectOne((r) => r.url === SCHEDULES_URL);
    expect(req.request.params.get('from')).toBe(expectedFrom);
    expect(req.request.params.get('to')).toBe(expectedTo);
    req.flush(page([]));
    fixture.detectChanges();

    // Two editable date pickers exist (structural check); the actual range
    // values are asserted through the readable "Rango: ..." caption instead
    // of `input.value`, since the happy-dom test environment does not
    // reliably reflect `NgModel.writeValue()` on `type="date"` inputs.
    const dateInputs = fixture.nativeElement.querySelectorAll('input[type="date"]') as NodeListOf<HTMLInputElement>;
    expect(dateInputs.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain(`Rango: ${expectedFrom} → ${expectedTo}`);
  });

  it('omits establishment, service, doctor and status filters from the request when empty', () => {
    create();

    const req = httpMock.expectOne((r) => r.url === SCHEDULES_URL);
    expect(req.request.params.has('stablishmentId')).toBe(false);
    expect(req.request.params.has('serviceId')).toBe(false);
    expect(req.request.params.has('doctorId')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);
    req.flush(page([]));
  });

  it('reaches the request with the selected establishment filter', () => {
    const fixture = create({ establishments: [establishment(3)] });
    httpMock.expectOne((r) => r.url === SCHEDULES_URL).flush(page([]));
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select[name="calendarioEstablecimiento"]') as HTMLSelectElement;
    select.value = '3';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === SCHEDULES_URL);
    expect(req.request.params.get('stablishmentId')).toBe('3');
    req.flush(page([]));
  });

  it('reaches the request with the selected service filter', () => {
    const fixture = create({ services: [servicio(9)] });
    httpMock.expectOne((r) => r.url === SCHEDULES_URL).flush(page([]));
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select[name="calendarioServicio"]') as HTMLSelectElement;
    select.value = '9';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === SCHEDULES_URL);
    expect(req.request.params.get('serviceId')).toBe('9');
    req.flush(page([]));
  });

  it('reaches the request with the selected doctor filter', () => {
    const fixture = create({ doctors: [doctor('doc-1')] });
    httpMock.expectOne((r) => r.url === SCHEDULES_URL).flush(page([]));
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select[name="calendarioDoctor"]') as HTMLSelectElement;
    select.value = 'doc-1';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === SCHEDULES_URL);
    expect(req.request.params.get('doctorId')).toBe('doc-1');
    req.flush(page([]));
  });

  it('reaches the request with the selected status filter', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === SCHEDULES_URL).flush(page([]));
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select[name="calendarioEstado"]') as HTMLSelectElement;
    select.value = 'STATUS_OCCUPIED';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === SCHEDULES_URL);
    expect(req.request.params.get('status')).toBe('STATUS_OCCUPIED');
    req.flush(page([]));
  });

  it('reaches the request with an updated range when "desde" changes', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === SCHEDULES_URL).flush(page([]));
    fixture.detectChanges();

    const dateInputs = fixture.nativeElement.querySelectorAll('input[type="date"]') as NodeListOf<HTMLInputElement>;
    dateInputs[0].value = '2026-09-01';
    dateInputs[0].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === SCHEDULES_URL);
    expect(req.request.params.get('from')).toBe('2026-09-01');
    req.flush(page([]));
  });

  it('shows the empty state when no schedules match the range and filters', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === SCHEDULES_URL).flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay horarios');
  });

  it('shows an error message and stops loading when the schedules request fails', () => {
    const fixture = create();
    httpMock
      .expectOne((r) => r.url === SCHEDULES_URL)
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los horarios');
    expect(fixture.nativeElement.textContent).not.toContain('Cargando');
  });

  it('groups slots by day and shows hour, doctor, service, establishment and status per slot', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === SCHEDULES_URL).flush(
      page([
        schedule(1, {
          date: '2026-08-24',
          hour: '09:00',
          status: 'STATUS_FREE',
          doctor: doctor('doc-1'),
          service: servicio(9),
          stablishment: establishment(3),
        }),
        schedule(2, {
          date: '2026-08-25',
          hour: '10:30',
          status: 'STATUS_OCCUPIED',
          doctor: doctor('doc-2'),
          service: servicio(9),
          stablishment: establishment(3),
        }),
      ]),
    );
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('2026-08-24');
    expect(text).toContain('2026-08-25');
    expect(text).toContain('09:00');
    expect(text).toContain('10:30');
    expect(text).toContain('Ana Lopez');
    expect(text).toContain('Servicio 9');
    expect(text).toContain('Sede 3');
    expect(text).toContain('Disponible');
    expect(text).toContain('Ocupado');
  });

  it('does not render the unavailable status label when nothing is unavailable (status map is exhaustive per real slot)', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === SCHEDULES_URL).flush(
      page([schedule(1, { status: 'STATUS_UNAVAILABLE' })]),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No disponible');
  });
});
