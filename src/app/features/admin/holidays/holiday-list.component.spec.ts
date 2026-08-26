import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { BlockReason, Establishment, Holiday, Page } from '../../../core/models';
import { HolidayListComponent } from './holiday-list.component';

const HOLIDAYS_URL = '/api/holidays';
const ESTABLISHMENTS_URL = '/api/stablishments';
const BLOCK_REASONS_URL = '/api/block-reasons';

function establishment(id: number, name = `Sede ${id}`): Establishment {
  return { id, name, address: `Dirección ${id}` };
}

function blockReason(id: number, description = `Motivo ${id}`): BlockReason {
  return { id, description };
}

function holiday(id: number, overrides: Partial<Holiday> = {}): Holiday {
  return {
    id,
    date: '2026-12-25',
    description: 'Navidad',
    reason: blockReason(1, 'Feriado nacional'),
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

type Fixture = ReturnType<typeof TestBed.createComponent<HolidayListComponent>>;

describe('HolidayListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function create(catalogs: { establishments?: Establishment[]; reasons?: BlockReason[] } = {}): Fixture {
    const fixture = TestBed.createComponent(HolidayListComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === ESTABLISHMENTS_URL).flush(page(catalogs.establishments ?? [establishment(1)]));
    httpMock.expectOne((r) => r.url === BLOCK_REASONS_URL).flush(page(catalogs.reasons ?? [blockReason(1)]));

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
    httpMock.expectOne((r) => r.url === HOLIDAYS_URL).flush(page([]));
  });

  it('omits the stablishmentId filter from the request when set to "todas las sedes"', () => {
    create();

    const req = httpMock.expectOne((r) => r.url === HOLIDAYS_URL);
    expect(req.request.params.has('stablishmentId')).toBe(false);
    req.flush(page([]));
  });

  it('reaches the request with the selected establishment filter', () => {
    const fixture = create({ establishments: [establishment(3)] });
    httpMock.expectOne((r) => r.url === HOLIDAYS_URL).flush(page([]));
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select[name="holidayEstablishmentFilter"]') as HTMLSelectElement;
    select.value = '3';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === HOLIDAYS_URL);
    expect(req.request.params.get('stablishmentId')).toBe('3');
    req.flush(page([]));
  });

  it('shows the empty state when there are no holidays', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === HOLIDAYS_URL).flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay feriados registrados');
  });

  it('shows the backend {message} error and stops loading when the list request fails', () => {
    const fixture = create();
    httpMock
      .expectOne((r) => r.url === HOLIDAYS_URL)
      .flush({ message: 'Ocurrió un error interno en el servidor' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ocurrió un error interno en el servidor');
    expect(fixture.nativeElement.textContent).not.toContain('Cargando');
  });

  it('renders a global holiday distinctly from a site-specific one', () => {
    const fixture = create({ establishments: [establishment(3, 'Sede Norte')] });
    httpMock.expectOne((r) => r.url === HOLIDAYS_URL).flush(
      page([
        holiday(1, { description: 'Navidad', stablishment: null }),
        holiday(2, { description: 'Aniversario Sede Norte', stablishment: establishment(3, 'Sede Norte') }),
      ]),
    );
    fixture.detectChanges();

    const rows = Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLTableRowElement[];
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Todas las sedes');
    expect(rows[0].textContent).not.toContain('Sede Norte');
    expect(rows[1].textContent).toContain('Sede Norte');
    expect(rows[1].textContent).not.toContain('Todas las sedes');
  });

  it('creates a global holiday (no stablishment selected) and reloads the list', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === HOLIDAYS_URL).flush(page([]));
    fixture.detectChanges();

    findButton(fixture, 'Nuevo Feriado').click();
    fixture.detectChanges();

    const dateInput = fixture.nativeElement.querySelector('#holidayDate') as HTMLInputElement;
    dateInput.value = '2026-12-25';
    dateInput.dispatchEvent(new Event('input'));

    const descInput = fixture.nativeElement.querySelector('#holidayDescription') as HTMLInputElement;
    descInput.value = 'Navidad';
    descInput.dispatchEvent(new Event('input'));

    const reasonSelect = fixture.nativeElement.querySelector('#holidayReason') as HTMLSelectElement;
    reasonSelect.value = '1';
    reasonSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );

    const createReq = httpMock.expectOne(`${HOLIDAYS_URL}/save`);
    expect(createReq.request.body.stablishment).toBeFalsy();
    expect(createReq.request.body.reason).toEqual({ id: 1 });
    createReq.flush(holiday(1, { stablishment: null }));

    httpMock.expectOne((r) => r.url === HOLIDAYS_URL).flush(page([holiday(1, { stablishment: null })]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Todas las sedes');
  });

  it('edits a holiday and reloads the list', () => {
    const fixture = create({ establishments: [establishment(3, 'Sede Norte')] });
    httpMock.expectOne((r) => r.url === HOLIDAYS_URL).flush(page([holiday(1, { description: 'Navidad' })]));
    fixture.detectChanges();

    findButton(fixture, 'Editar').click();
    fixture.detectChanges();

    const descInput = fixture.nativeElement.querySelector('#holidayDescription') as HTMLInputElement;
    descInput.value = 'Navidad (actualizado)';
    descInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );

    const updateReq = httpMock.expectOne(`${HOLIDAYS_URL}/1`);
    expect(updateReq.request.method).toBe('PUT');
    updateReq.flush(holiday(1, { description: 'Navidad (actualizado)' }));

    httpMock.expectOne((r) => r.url === HOLIDAYS_URL).flush(page([holiday(1, { description: 'Navidad (actualizado)' })]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Navidad (actualizado)');
  });

  it('deletes a holiday after confirmation and reloads the list', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === HOLIDAYS_URL).flush(page([holiday(1)]));
    fixture.detectChanges();

    findButton(fixture, 'Eliminar').click();
    fixture.detectChanges();
    findButton(fixture, 'Eliminar Feriado').click();

    const deleteReq = httpMock.expectOne(`${HOLIDAYS_URL}/1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    httpMock.expectOne((r) => r.url === HOLIDAYS_URL).flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay feriados registrados');
  });

  it('shows the conflicting-slots warning when creating a holiday returns booked turns that were not blocked', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === HOLIDAYS_URL).flush(page([]));
    fixture.detectChanges();

    findButton(fixture, 'Nuevo Feriado').click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('#holidayDate') as HTMLInputElement).value = '2026-12-25';
    (fixture.nativeElement.querySelector('#holidayDate') as HTMLInputElement).dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('#holidayDescription') as HTMLInputElement).value = 'Navidad';
    (fixture.nativeElement.querySelector('#holidayDescription') as HTMLInputElement).dispatchEvent(new Event('input'));
    const reasonSelect = fixture.nativeElement.querySelector('#holidayReason') as HTMLSelectElement;
    reasonSelect.value = '1';
    reasonSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );

    httpMock.expectOne(`${HOLIDAYS_URL}/save`).flush(holiday(1, { conflictingScheduleIds: [42, 43] }));
    httpMock.expectOne((r) => r.url === HOLIDAYS_URL).flush(page([holiday(1)]));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('42');
    expect(text).toContain('43');
    expect(text).toMatch(/no (pudieron|fueron) bloquead/i);

    // Does not auto-dismiss: still visible without any further interaction.
    expect(fixture.nativeElement.textContent).toContain('42');
  });

  it('does not show the conflicting-slots warning when the response carries none', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === HOLIDAYS_URL).flush(page([]));
    fixture.detectChanges();

    findButton(fixture, 'Nuevo Feriado').click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('#holidayDate') as HTMLInputElement).value = '2026-12-25';
    (fixture.nativeElement.querySelector('#holidayDate') as HTMLInputElement).dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('#holidayDescription') as HTMLInputElement).value = 'Navidad';
    (fixture.nativeElement.querySelector('#holidayDescription') as HTMLInputElement).dispatchEvent(new Event('input'));
    const reasonSelect = fixture.nativeElement.querySelector('#holidayReason') as HTMLSelectElement;
    reasonSelect.value = '1';
    reasonSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );

    httpMock.expectOne(`${HOLIDAYS_URL}/save`).flush(holiday(1, { conflictingScheduleIds: [] }));
    httpMock.expectOne((r) => r.url === HOLIDAYS_URL).flush(page([holiday(1)]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toMatch(/no (pudieron|fueron) bloquead/i);
  });
});
