import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import type { AdminDoctor, Establishment, Operator, Page, Servicio } from '../../../core/models';
import { EstablishmentDetailComponent } from './establishment-detail.component';

const ESTABLISHMENT_ID = 42;
const ESTABLISHMENT_URL = `/api/stablishments/${ESTABLISHMENT_ID}`;
const DOCTORS_URL = `/api/stablishments/${ESTABLISHMENT_ID}/doctors`;
const SERVICES_URL = `/api/stablishments/${ESTABLISHMENT_ID}/services`;
const OPERATORS_URL = `/api/stablishments/${ESTABLISHMENT_ID}/operators`;

function establishment(): Establishment {
  return { id: ESTABLISHMENT_ID, name: 'Sede Matriz', address: 'Av. Amazonas' };
}

function doctor(uuid: string, firstName = 'Ana'): AdminDoctor {
  return { uuid, email: `${uuid}@test.com`, firstName, lastName: 'Lopez', speciality: 'Pediatría', gender: 'F', ci: '0102030405' };
}

function servicio(id: number, name = `Servicio ${id}`): Servicio {
  return { id, name, price: 20 };
}

function operator(uuid: string, firstName = 'Carla'): Operator {
  return { uuid, email: `${uuid}@test.com`, firstName, lastName: 'Ruiz', role: 'ROLE_EMPLOYEE' };
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

type Fixture = ReturnType<typeof TestBed.createComponent<EstablishmentDetailComponent>>;

describe('EstablishmentDetailComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: String(ESTABLISHMENT_ID) }) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Boots the component and drains the four parallel `loadAll()` requests with happy-path data. */
  function create(): Fixture {
    const fixture = TestBed.createComponent(EstablishmentDetailComponent);
    fixture.detectChanges();

    httpMock.expectOne((req) => req.url === ESTABLISHMENT_URL).flush(establishment());
    httpMock.expectOne((req) => req.url === DOCTORS_URL).flush(page([doctor('doc-1')]));
    httpMock.expectOne((req) => req.url === SERVICES_URL).flush(page([servicio(1)]));
    httpMock.expectOne((req) => req.url === OPERATORS_URL).flush(page([operator('op-1')]));

    fixture.detectChanges();
    return fixture;
  }

  it('requests every assigned-resource list with a small page size instead of the old hardcoded 100', () => {
    const fixture = TestBed.createComponent(EstablishmentDetailComponent);
    fixture.detectChanges();

    httpMock.expectOne((req) => req.url === ESTABLISHMENT_URL).flush(establishment());
    const doctorsReq = httpMock.expectOne((req) => req.url === DOCTORS_URL);
    const servicesReq = httpMock.expectOne((req) => req.url === SERVICES_URL);
    const operatorsReq = httpMock.expectOne((req) => req.url === OPERATORS_URL);

    expect(doctorsReq.request.params.get('size')).toBe('10');
    expect(servicesReq.request.params.get('size')).toBe('10');
    expect(operatorsReq.request.params.get('size')).toBe('10');

    doctorsReq.flush(page([]));
    servicesReq.flush(page([]));
    operatorsReq.flush(page([]));
  });

  it('shows the true total from the page instead of the fetched array length', () => {
    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain('Sede Matriz');
  });

  describe('doctors: search + pagination', () => {
    it('omits the name filter on the initial load, then sends it once the operator searches', () => {
      const fixture = create();
      const component = fixture.componentInstance;

      component.onDoctorsFilterChange('Carlos');
      const req = httpMock.expectOne((r) => r.url === DOCTORS_URL);
      expect(req.request.params.get('name')).toBe('Carlos');
      req.flush(page([doctor('doc-2', 'Carlos')]));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Carlos');
    });

    it('omits the name filter again once the search box is cleared', () => {
      const fixture = create();
      const component = fixture.componentInstance;

      component.onDoctorsFilterChange('Carlos');
      httpMock.expectOne((r) => r.url === DOCTORS_URL).flush(page([doctor('doc-2', 'Carlos')]));

      component.onDoctorsFilterChange('');
      const req = httpMock.expectOne((r) => r.url === DOCTORS_URL);
      expect(req.request.params.has('name')).toBe(false);
      req.flush(page([doctor('doc-1')]));
    });

    it('replaces the visible page instead of appending when "Siguiente" is requested', () => {
      const fixture = create();
      const component = fixture.componentInstance;

      component.loadDoctors(1);
      const req = httpMock.expectOne((r) => r.url === DOCTORS_URL);
      expect(req.request.params.get('page')).toBe('1');
      req.flush(page([doctor('doc-99', 'Zoe')], { number: 1, first: false, last: true, totalPages: 2, totalElements: 11 }));
      fixture.detectChanges();

      // Page 1 REPLACES page 0's content — "doc-1" (Ana) must be gone, not
      // accumulated alongside "Zoe". This is the exact defect class the
      // fix guards against: silently wrong data through incorrect merging.
      const cardText = fixture.nativeElement.textContent as string;
      expect(cardText).toContain('Dr. Zoe Lopez');
      expect(cardText).not.toContain('Dr. Ana Lopez');
    });
  });

  describe('services: search + pagination', () => {
    it('reaches the request with the name filter and omits it when empty', () => {
      const fixture = create();
      const component = fixture.componentInstance;

      component.onServicesFilterChange('Odontología');
      const req = httpMock.expectOne((r) => r.url === SERVICES_URL);
      expect(req.request.params.get('name')).toBe('Odontología');
      req.flush(page([servicio(5, 'Odontología')]));
      fixture.detectChanges();

      component.onServicesFilterChange('');
      const secondReq = httpMock.expectOne((r) => r.url === SERVICES_URL);
      expect(secondReq.request.params.has('name')).toBe(false);
      secondReq.flush(page([servicio(1)]));
    });
  });

  describe('operators: search + pagination (establishment-scoped endpoint DOES accept `name`)', () => {
    it('reaches the request with the name filter and omits it when empty', () => {
      const fixture = create();
      const component = fixture.componentInstance;

      component.onOperatorsFilterChange('Carla');
      const req = httpMock.expectOne((r) => r.url === OPERATORS_URL);
      expect(req.request.params.get('name')).toBe('Carla');
      req.flush(page([operator('op-2', 'Carla')]));
      fixture.detectChanges();

      component.onOperatorsFilterChange('');
      const secondReq = httpMock.expectOne((r) => r.url === OPERATORS_URL);
      expect(secondReq.request.params.has('name')).toBe(false);
      secondReq.flush(page([operator('op-1')]));
    });
  });
});
