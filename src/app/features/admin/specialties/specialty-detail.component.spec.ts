import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import type { AdminDoctor, Establishment, Page, Servicio } from '../../../core/models';
import { SpecialtyDetailComponent } from './specialty-detail.component';

const SERVICE_ID = 7;
const SERVICE_URL = `http://localhost:8080/api/services/${SERVICE_ID}`;
const DOCTORS_BY_SERVICE_URL = `http://localhost:8080/api/services/${SERVICE_ID}/doctors`;
const ESTABLISHMENTS_BY_SERVICE_URL = `http://localhost:8080/api/services/${SERVICE_ID}/stablishments`;
const SCHEDULES_URL = `http://localhost:8080/api/services/${SERVICE_ID}/schedules`;
const ALL_ESTABLISHMENTS_URL = 'http://localhost:8080/api/stablishments';
const ALL_DOCTORS_URL = 'http://localhost:8080/api/doctors';

function servicio(): Servicio {
  return { id: SERVICE_ID, name: 'Consulta General', price: 25 };
}

function establishment(id: number): Establishment {
  return { id, name: `Sede ${id}`, address: `Dirección ${id}` };
}

function doctor(uuid: string, firstName = 'Ana'): AdminDoctor {
  return { uuid, email: `${uuid}@test.com`, firstName, lastName: 'Lopez', speciality: 'Pediatría', gender: 'F', ci: '0102030405' };
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

type Fixture = ReturnType<typeof TestBed.createComponent<SpecialtyDetailComponent>>;

describe('SpecialtyDetailComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: String(SERVICE_ID) })),
            snapshot: { paramMap: convertToParamMap({ id: String(SERVICE_ID) }) },
          },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Boots the component and drains the six parallel `ngOnInit` requests with single-page happy-path data. */
  function create(): Fixture {
    const fixture = TestBed.createComponent(SpecialtyDetailComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === SERVICE_URL).flush(servicio());
    httpMock.expectOne((r) => r.url === DOCTORS_BY_SERVICE_URL).flush(page([]));
    httpMock.expectOne((r) => r.url === ESTABLISHMENTS_BY_SERVICE_URL).flush(page([]));
    httpMock.expectOne((r) => r.url === SCHEDULES_URL).flush(page([]));
    httpMock.expectOne((r) => r.url === ALL_ESTABLISHMENTS_URL).flush(page([establishment(1)]));
    httpMock.expectOne((r) => r.url === ALL_DOCTORS_URL).flush(page([doctor('doc-1')]));

    fixture.detectChanges();
    return fixture;
  }

  it('does not stop at the first page when the establishment catalog reports more than one page', () => {
    const fixture = TestBed.createComponent(SpecialtyDetailComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === SERVICE_URL).flush(servicio());
    httpMock.expectOne((r) => r.url === DOCTORS_BY_SERVICE_URL).flush(page([]));
    httpMock.expectOne((r) => r.url === ESTABLISHMENTS_BY_SERVICE_URL).flush(page([]));
    httpMock.expectOne((r) => r.url === SCHEDULES_URL).flush(page([]));
    httpMock.expectOne((r) => r.url === ALL_DOCTORS_URL).flush(page([doctor('doc-1')]));

    const firstPageReq = httpMock.expectOne((r) => r.url === ALL_ESTABLISHMENTS_URL);
    expect(firstPageReq.request.params.get('page')).toBe('0');
    firstPageReq.flush(page([establishment(1)], { number: 0, last: false, totalPages: 2, totalElements: 2 }));

    // The old `getAll(0, 100)` never issued this second request — anything
    // past the first page silently vanished. This proves the fix actually
    // continues fetching instead of just widening the page size.
    const secondPageReq = httpMock.expectOne((r) => r.url === ALL_ESTABLISHMENTS_URL);
    expect(secondPageReq.request.params.get('page')).toBe('1');
    secondPageReq.flush(page([establishment(2)], { number: 1, last: true }));
    fixture.detectChanges();

    // The establishment filter `<select>` is always rendered (no modal
    // needed) and iterates the same `establishments()` signal the create/
    // batch modals use — asserting on it here proves both pages landed.
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sede 1');
    expect(text).toContain('Sede 2');
    expect(text).not.toContain('catálogo completo de establecimientos');
  });

  it('concatenates every page of the doctor fallback catalog instead of only the first 100', () => {
    const fixture = TestBed.createComponent(SpecialtyDetailComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === SERVICE_URL).flush(servicio());
    httpMock.expectOne((r) => r.url === DOCTORS_BY_SERVICE_URL).flush(page([]));
    httpMock.expectOne((r) => r.url === ESTABLISHMENTS_BY_SERVICE_URL).flush(page([]));
    httpMock.expectOne((r) => r.url === SCHEDULES_URL).flush(page([]));
    httpMock.expectOne((r) => r.url === ALL_ESTABLISHMENTS_URL).flush(page([establishment(1)]));

    httpMock
      .expectOne((r) => r.url === ALL_DOCTORS_URL)
      .flush(page([doctor('doc-1', 'Ana')], { last: false, totalPages: 2 }));
    httpMock
      .expectOne((r) => r.url === ALL_DOCTORS_URL)
      .flush(page([doctor('doc-2', 'Zoe')], { number: 1, last: true }));
    fixture.detectChanges();

    // "Todos los Doctores" only renders inside the create-schedule modal.
    fixture.componentInstance.openCreateScheduleModal();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Dr. Ana Lopez');
    expect(text).toContain('Dr. Zoe Lopez');
    expect(text).not.toContain('catálogo completo de doctores');
  });

  it('flags the establishment catalog as incomplete (and warns in the UI) when a later page fails', () => {
    const fixture = TestBed.createComponent(SpecialtyDetailComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === SERVICE_URL).flush(servicio());
    httpMock.expectOne((r) => r.url === DOCTORS_BY_SERVICE_URL).flush(page([]));
    httpMock.expectOne((r) => r.url === ESTABLISHMENTS_BY_SERVICE_URL).flush(page([]));
    httpMock.expectOne((r) => r.url === SCHEDULES_URL).flush(page([]));
    httpMock.expectOne((r) => r.url === ALL_DOCTORS_URL).flush(page([]));

    httpMock
      .expectOne((r) => r.url === ALL_ESTABLISHMENTS_URL)
      .flush(page([establishment(1)], { last: false, totalPages: 2 }));
    httpMock
      .expectOne((r) => r.url === ALL_ESTABLISHMENTS_URL)
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    // Never silently show a subset: the first page's establishment must
    // still be usable, but the UI must say the catalog is incomplete.
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sede 1');
    expect(text).toContain('catálogo completo de establecimientos');
  });

  it('boots normally end-to-end with single-page catalogs (regression: happy path unaffected)', () => {
    const fixture = create();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Consulta General');
    expect(text).not.toContain('catálogo completo');
  });
});
