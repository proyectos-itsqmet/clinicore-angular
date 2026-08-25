import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import type { ClinicalAccessLog, Page } from '../../../core/models';
import { AuditoriaHcListComponent } from './auditoria-hc-list.component';

const URL = 'http://localhost:8080/api/clinical-access-logs';
const PATIENT_ID = 'patient-uuid-1';

function log(id: number, overrides: Partial<ClinicalAccessLog> = {}): ClinicalAccessLog {
  return {
    id,
    patientUuid: PATIENT_ID,
    accessedByUuid: 'doctor-uuid-1',
    accessedByRole: 'ROLE_DOCTOR',
    resourceType: 'ENCOUNTER',
    resourceId: 7,
    accessedAt: '2026-08-24T15:30:00Z',
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

type Fixture = ReturnType<typeof TestBed.createComponent<AuditoriaHcListComponent>>;

describe('AuditoriaHcListComponent', () => {
  let httpMock: HttpTestingController;
  let currentQueryParams: Record<string, string> = {};

  beforeEach(() => {
    currentQueryParams = {};
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get queryParamMap() {
                return convertToParamMap(currentQueryParams);
              },
            },
          },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function setup(queryParams: Record<string, string> = {}): Fixture {
    currentQueryParams = queryParams;
    const fixture = TestBed.createComponent(AuditoriaHcListComponent);
    fixture.detectChanges();
    return fixture;
  }

  function findButton(fixture: Fixture, text: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find((button) =>
      (button as HTMLElement).textContent?.trim().includes(text),
    ) as HTMLButtonElement;
  }

  it('loads without a patientId filter by default', () => {
    setup();

    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.has('patientId')).toBe(false);
    req.flush(page([]));
  });

  it('prefills and applies the patientId filter from the query param', () => {
    setup({ patientId: PATIENT_ID });

    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('patientId')).toBe(PATIENT_ID);
    req.flush(page([]));
  });

  it('applies a manually entered patientId filter', () => {
    const fixture = setup();
    httpMock.expectOne((r) => r.url === URL).flush(page([]));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#auditPatientFilter') as HTMLInputElement;
    input.value = PATIENT_ID;
    input.dispatchEvent(new Event('input'));
    findButton(fixture, 'Filtrar').click();

    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('patientId')).toBe(PATIENT_ID);
    req.flush(page([]));
  });

  it('shows the empty state when there are no access log entries', () => {
    const fixture = setup();
    httpMock.expectOne((r) => r.url === URL).flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay registros de auditoría');
  });

  it('shows the backend error message when the list request fails', () => {
    const fixture = setup();
    httpMock.expectOne((r) => r.url === URL).flush({ message: 'Ocurrió un error interno en el servidor' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ocurrió un error interno en el servidor');
  });

  it('distinguishes a detail read (resourceId) from a list read (null resourceId) instead of rendering a blank cell', () => {
    const fixture = setup();
    httpMock.expectOne((r) => r.url === URL).flush(
      page([
        log(1, { resourceType: 'ENCOUNTER', resourceId: 7 }),
        log(2, { resourceType: 'ENCOUNTER_LIST', resourceId: null }),
        log(3, { resourceType: 'PRESCRIPTION_LIST', resourceId: null }),
      ]),
    );
    fixture.detectChanges();

    const rows = Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLTableRowElement[];
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('#7');
    expect(rows[0].textContent).not.toMatch(/listado/i);
    expect(rows[1].textContent).toMatch(/listado/i);
    expect(rows[1].textContent).not.toContain('#');
    expect(rows[2].textContent).toMatch(/listado/i);
  });

  it('renders a role pill and human-readable resource-type labels', () => {
    const fixture = setup();
    httpMock.expectOne((r) => r.url === URL).flush(page([log(1, { accessedByRole: 'ROLE_ADMIN', resourceType: 'PRESCRIPTION', resourceId: 5 })]));
    fixture.detectChanges();

    const rowText = (fixture.nativeElement.querySelector('tbody tr') as HTMLElement).textContent ?? '';
    expect(rowText).toContain('Administrador');
    expect(rowText.toLowerCase()).toContain('receta');
  });

  it('paginates through results', () => {
    const fixture = setup();
    httpMock.expectOne((r) => r.url === URL).flush(page([log(1)], { totalPages: 2, last: false }));
    fixture.detectChanges();

    findButton(fixture, 'Siguiente').click();

    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(page([log(2)], { number: 1, first: false, last: true, totalPages: 2 }));
  });

  it('renders a clear explanation, not a generic error, for the admin-only permission denial', () => {
    const fixture = setup();
    httpMock.expectOne((r) => r.url === URL).flush({ message: 'Access Denied' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text.toLowerCase()).toContain('administrador');
    expect(text).not.toBe('Access Denied');
  });
});
