import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import type { AdminDoctor, BlockReason, Page, TimeOff, TimeOffKind } from '../../../core/models';
import { TimeOffListComponent } from './time-off-list.component';

const TIME_OFFS_URL = 'http://localhost:8080/api/time-offs';
const DOCTORS_URL = 'http://localhost:8080/api/doctors';
const BLOCK_REASONS_URL = 'http://localhost:8080/api/block-reasons';

function doctor(uuid: string, firstName = 'Ana', lastName = 'Lopez'): AdminDoctor {
  return { uuid, email: `${uuid}@test.com`, firstName, lastName, speciality: 'Pediatría', gender: 'F', ci: '0102030405' };
}

function blockReason(id: number, description = `Motivo ${id}`): BlockReason {
  return { id, description };
}

function timeOff(id: number, overrides: Partial<TimeOff> = {}): TimeOff {
  return {
    id,
    doctor: { uuid: 'doc-1', firstName: 'Ana', lastName: 'Lopez' },
    kind: 'KIND_VACATION',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    reason: blockReason(2, 'Vacaciones anuales'),
    createdAt: '2026-08-24T10:00:00Z',
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
    size: 10,
    totalElements: content.length,
    totalPages: 1,
    pageable: {
      offset: 0,
      pageNumber: 0,
      pageSize: 10,
      paged: true,
      unpaged: false,
      sort: { empty: true, sorted: false, unsorted: true },
    },
    sort: { empty: true, sorted: false, unsorted: true },
    ...overrides,
  };
}

type Fixture = ReturnType<typeof TestBed.createComponent<TimeOffListComponent>>;

function configure(kind: TimeOffKind): void {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { kind } } } },
    ],
  });
}

describe('TimeOffListComponent', () => {
  let httpMock: HttpTestingController;

  afterEach(() => {
    httpMock.verify();
  });

  function create(
    kind: TimeOffKind = 'KIND_VACATION',
    catalogs: { doctors?: AdminDoctor[]; reasons?: BlockReason[] } = {},
  ): Fixture {
    configure(kind);
    httpMock = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(TimeOffListComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === DOCTORS_URL).flush(page(catalogs.doctors ?? [doctor('doc-1')]));
    httpMock.expectOne((r) => r.url === BLOCK_REASONS_URL).flush(page(catalogs.reasons ?? [blockReason(2)]));

    return fixture;
  }

  function findButton(fixture: Fixture, text: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLElement).textContent?.trim() === text,
    ) as HTMLButtonElement;
  }

  it('shows a loading state before the first page resolves', () => {
    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain('Cargando');
    httpMock.expectOne((r) => r.url === TIME_OFFS_URL).flush(page([]));
  });

  it('reads kind=KIND_VACATION from route data, titles the page "Vacaciones" and requests it as a fixed filter', () => {
    create('KIND_VACATION');

    const req = httpMock.expectOne((r) => r.url === TIME_OFFS_URL);
    expect(req.request.params.get('kind')).toBe('KIND_VACATION');
    req.flush(page([]));
  });

  it('reads kind=KIND_PERMISSION from route data and titles the page "Permisos"', () => {
    const fixture = create('KIND_PERMISSION');
    httpMock.expectOne((r) => r.url === TIME_OFFS_URL).flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Permisos');
    expect(fixture.nativeElement.textContent).not.toContain('Vacaciones');
  });

  it('omits the doctorId filter from the request when set to "todos los doctores"', () => {
    create();

    const req = httpMock.expectOne((r) => r.url === TIME_OFFS_URL);
    expect(req.request.params.has('doctorId')).toBe(false);
    req.flush(page([]));
  });

  it('reaches the request with the selected doctor filter', () => {
    const fixture = create('KIND_VACATION', { doctors: [doctor('doc-9')] });
    httpMock.expectOne((r) => r.url === TIME_OFFS_URL).flush(page([]));
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select[name="timeOffDoctorFilter"]') as HTMLSelectElement;
    select.value = 'doc-9';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === TIME_OFFS_URL);
    expect(req.request.params.get('doctorId')).toBe('doc-9');
    req.flush(page([]));
  });

  it('shows the empty state when there are no records', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === TIME_OFFS_URL).flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay vacaciones registradas');
  });

  it('shows the backend {message} error and stops loading when the list request fails', () => {
    const fixture = create();
    httpMock
      .expectOne((r) => r.url === TIME_OFFS_URL)
      .flush({ message: 'Ocurrió un error interno en el servidor' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ocurrió un error interno en el servidor');
    expect(fixture.nativeElement.textContent).not.toContain('Cargando');
  });

  it('creates a time-off with the kind fixed by the route (not user-editable) and reloads the list', () => {
    const fixture = create('KIND_PERMISSION', { doctors: [doctor('doc-1')], reasons: [blockReason(2, 'Cita médica')] });
    httpMock.expectOne((r) => r.url === TIME_OFFS_URL).flush(page([]));
    fixture.detectChanges();

    findButton(fixture, 'Nuevo Permiso').click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('#timeOffStartDate') as HTMLInputElement).value = '2026-10-01';
    (fixture.nativeElement.querySelector('#timeOffStartDate') as HTMLInputElement).dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('#timeOffEndDate') as HTMLInputElement).value = '2026-10-03';
    (fixture.nativeElement.querySelector('#timeOffEndDate') as HTMLInputElement).dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );

    const createReq = httpMock.expectOne(`${TIME_OFFS_URL}/save`);
    expect(createReq.request.body).toEqual({
      doctor: { uuid: 'doc-1' },
      kind: 'KIND_PERMISSION',
      startDate: '2026-10-01',
      endDate: '2026-10-03',
      reason: { id: 2 },
    });
    createReq.flush(timeOff(1, { kind: 'KIND_PERMISSION' }));

    httpMock.expectOne((r) => r.url === TIME_OFFS_URL).flush(page([timeOff(1, { kind: 'KIND_PERMISSION' })]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ana Lopez');
  });

  it('rejects an end date earlier than the start date before calling the API', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === TIME_OFFS_URL).flush(page([]));
    fixture.detectChanges();

    findButton(fixture, 'Nueva Vacación').click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('#timeOffStartDate') as HTMLInputElement).value = '2026-10-10';
    (fixture.nativeElement.querySelector('#timeOffStartDate') as HTMLInputElement).dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('#timeOffEndDate') as HTMLInputElement).value = '2026-10-01';
    (fixture.nativeElement.querySelector('#timeOffEndDate') as HTMLInputElement).dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    fixture.detectChanges();

    httpMock.expectNone(`${TIME_OFFS_URL}/save`);
    expect(fixture.nativeElement.textContent).toContain('no puede ser anterior');
  });

  it('edits a time-off and reloads the list', () => {
    const fixture = create('KIND_VACATION', { doctors: [doctor('doc-1')] });
    httpMock.expectOne((r) => r.url === TIME_OFFS_URL).flush(page([timeOff(1)]));
    fixture.detectChanges();

    findButton(fixture, 'Editar').click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('#timeOffEndDate') as HTMLInputElement).value = '2026-09-10';
    (fixture.nativeElement.querySelector('#timeOffEndDate') as HTMLInputElement).dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );

    const updateReq = httpMock.expectOne(`${TIME_OFFS_URL}/1`);
    expect(updateReq.request.method).toBe('PUT');
    expect(updateReq.request.body.endDate).toBe('2026-09-10');
    updateReq.flush(timeOff(1, { endDate: '2026-09-10' }));

    httpMock.expectOne((r) => r.url === TIME_OFFS_URL).flush(page([timeOff(1, { endDate: '2026-09-10' })]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('2026-09-10');
  });

  it('deletes a time-off after confirmation and reloads the list', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === TIME_OFFS_URL).flush(page([timeOff(1)]));
    fixture.detectChanges();

    findButton(fixture, 'Eliminar').click();
    fixture.detectChanges();
    findButton(fixture, 'Eliminar Registro').click();

    const deleteReq = httpMock.expectOne(`${TIME_OFFS_URL}/1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    httpMock.expectOne((r) => r.url === TIME_OFFS_URL).flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay vacaciones registradas');
  });

  it('shows the conflicting-slots warning when creating a time-off returns booked turns that were not blocked', () => {
    const fixture = create('KIND_VACATION', { doctors: [doctor('doc-1')] });
    httpMock.expectOne((r) => r.url === TIME_OFFS_URL).flush(page([]));
    fixture.detectChanges();

    findButton(fixture, 'Nueva Vacación').click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('#timeOffStartDate') as HTMLInputElement).value = '2026-09-01';
    (fixture.nativeElement.querySelector('#timeOffStartDate') as HTMLInputElement).dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('#timeOffEndDate') as HTMLInputElement).value = '2026-09-05';
    (fixture.nativeElement.querySelector('#timeOffEndDate') as HTMLInputElement).dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );

    httpMock.expectOne(`${TIME_OFFS_URL}/save`).flush(timeOff(1, { conflictingScheduleIds: [77] }));
    httpMock.expectOne((r) => r.url === TIME_OFFS_URL).flush(page([timeOff(1)]));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('77');
    expect(text).toMatch(/no (pudieron|fueron) bloquead/i);
  });
});
