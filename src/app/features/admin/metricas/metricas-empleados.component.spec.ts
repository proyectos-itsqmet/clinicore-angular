import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { DoctorMetrics, EmployeesMetrics, OperatorMetrics } from '../../../core/models';
import { MetricasEmpleadosComponent } from './metricas-empleados.component';

const URL = 'http://localhost:8080/api/metrics/employees';

function doctor(overrides: Partial<DoctorMetrics> = {}): DoctorMetrics {
  return {
    doctorId: 'doc-1',
    firstName: 'Carla',
    lastName: 'Mendez',
    speciality: 'Cardiología',
    attended: 20,
    cancelled: 3,
    noShows: 2,
    ...overrides,
  };
}

function operator(overrides: Partial<OperatorMetrics> = {}): OperatorMetrics {
  return { operatorId: 'op-1', firstName: 'Luis', lastName: 'Pena', turnsHandled: 11, cancelled: 2, ...overrides };
}

function response(doctors: DoctorMetrics[] = [], operators: OperatorMetrics[] = []): EmployeesMetrics {
  return { from: '2026-07-25', to: '2026-08-24', doctors, operators };
}

type Fixture = ReturnType<typeof TestBed.createComponent<MetricasEmpleadosComponent>>;

describe('MetricasEmpleadosComponent', () => {
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
    const fixture = TestBed.createComponent(MetricasEmpleadosComponent);
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

  it('renders doctor and operator rows with their attended/cancelled/noShows and handled/cancelled numbers', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(response([doctor()], [operator()]));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Carla Mendez');
    expect(text).toContain('Cardiología');
    expect(text).toContain('Luis Pena');

    const doctorRow = fixture.nativeElement.querySelector('table tbody tr') as HTMLTableRowElement;
    expect(doctorRow.textContent).toContain('20');
    expect(doctorRow.textContent).toContain('3');
    expect(doctorRow.textContent).toContain('2');
  });

  it('shows "Sin turnos en el rango" instead of an empty/broken bar when a doctor has zero tracked activity', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(response([doctor({ attended: 0, cancelled: 0, noShows: 0 })], []));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sin turnos en el rango');
  });

  it('shows the empty state per table when there are no doctors or operators', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(response([], []));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay doctores registrados en el sistema.');
    expect(fixture.nativeElement.textContent).toContain('No hay operadores registrados en el sistema.');
  });

  it('shows an error message and stops loading when the request fails', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush({ message: 'Ocurrió un error interno en el servidor' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ocurrió un error interno en el servidor');
    expect(fixture.nativeElement.textContent).not.toContain('Cargando');
  });
});
