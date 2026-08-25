import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import type { CoveragePlan, Establishment, Page, Patient, PatientCoverage, Servicio, Turn } from '../../../core/models';
import { PatientDetailComponent } from './patient-detail.component';

const PATIENT_ID = 'patient-uuid-1';
const PATIENTS_URL = `http://localhost:8080/api/patients/${PATIENT_ID}`;
const TURNS_URL = `http://localhost:8080/api/turns/patient/${PATIENT_ID}`;
const ESTABLISHMENTS_URL = 'http://localhost:8080/api/stablishments';
const SERVICES_URL = 'http://localhost:8080/api/services';
const SCHEDULES_URL = 'http://localhost:8080/api/schedules';

function patient(): Patient {
  return { uuid: PATIENT_ID, email: 'ana@test.com', firstName: 'Ana', lastName: 'Lopez', ci: '0102030405' };
}

function establishment(id: number): Establishment {
  return { id, name: `Sede ${id}`, address: `Dirección ${id}` };
}

function servicio(id: number): Servicio {
  return { id, name: `Servicio ${id}`, price: 15 };
}

function coveragePlan(id: number, overrides: Partial<CoveragePlan> = {}): CoveragePlan {
  return {
    id,
    insurer: { id: 1, name: 'IESS', type: 'INSURER_PUBLIC' },
    name: 'Plan Base',
    coveragePercentage: 80,
    copayAmount: null,
    ...overrides,
  };
}

function patientCoverage(id: number, overrides: Partial<PatientCoverage> = {}): PatientCoverage {
  return {
    id,
    patient: { uuid: PATIENT_ID, firstName: 'Ana', lastName: 'Lopez' },
    plan: coveragePlan(1),
    policyNumber: `POL-${id}`,
    validFrom: '2026-01-01',
    active: true,
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

type Fixture = ReturnType<typeof TestBed.createComponent<PatientDetailComponent>>;

describe('PatientDetailComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: PATIENT_ID }) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Boots the component and drains the four parallel ngOnInit requests with happy-path data. */
  function create(): Fixture {
    const fixture = TestBed.createComponent(PatientDetailComponent);
    fixture.detectChanges();

    httpMock.expectOne(PATIENTS_URL).flush(patient());
    httpMock.expectOne((req) => req.url === TURNS_URL).flush(page<Turn>([]));
    httpMock.expectOne((req) => req.url === ESTABLISHMENTS_URL).flush(page([establishment(1), establishment(2)]));
    httpMock.expectOne((req) => req.url === SERVICES_URL).flush(page([servicio(7), servicio(9)]));

    fixture.detectChanges();
    return fixture;
  }

  it('sets and renders patientError when the patient fails to load', () => {
    const fixture = TestBed.createComponent(PatientDetailComponent);
    fixture.detectChanges();

    httpMock.expectOne(PATIENTS_URL).flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne((req) => req.url === TURNS_URL).flush(page<Turn>([]));
    httpMock.expectOne((req) => req.url === ESTABLISHMENTS_URL).flush(page([]));
    httpMock.expectOne((req) => req.url === SERVICES_URL).flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudo cargar la información del paciente.');
  });

  it('sets and renders establishmentsError when the establishment catalog fails to load', () => {
    const fixture = TestBed.createComponent(PatientDetailComponent);
    fixture.detectChanges();

    httpMock.expectOne(PATIENTS_URL).flush(patient());
    httpMock.expectOne((req) => req.url === TURNS_URL).flush(page<Turn>([]));
    httpMock.expectOne((req) => req.url === ESTABLISHMENTS_URL).flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne((req) => req.url === SERVICES_URL).flush(page([]));
    fixture.detectChanges();

    fixture.componentInstance.openAssignTurnModal();
    httpMock.expectOne((req) => req.url === SCHEDULES_URL).flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los establecimientos disponibles.');
  });

  it('filters the new-turn schedule search by service, and omits it when empty', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.openAssignTurnModal();
    const firstReq = httpMock.expectOne((req) => req.url === SCHEDULES_URL);
    expect(firstReq.request.params.has('serviceId')).toBe(false);
    firstReq.flush(page([]));

    // Arrange via the reactive form directly (it's `protected`, same as every
    // other form on this component) — the assertion itself is fully
    // behavioral: what the outgoing HTTP request carries, below.
    (component as any).scheduleSearchForm.patchValue({ serviceId: '9' });
    component.onScheduleSearch();
    const secondReq = httpMock.expectOne((req) => req.url === SCHEDULES_URL);
    expect(secondReq.request.params.get('serviceId')).toBe('9');
    secondReq.flush(page([]));
  });

  describe('establishments/services catalogs: complete across every page', () => {
    it('fetches a second page of establishments when the first reports more than one page, and both stay usable', () => {
      const fixture = TestBed.createComponent(PatientDetailComponent);
      fixture.detectChanges();

      httpMock.expectOne(PATIENTS_URL).flush(patient());
      httpMock.expectOne((req) => req.url === TURNS_URL).flush(page<Turn>([]));
      httpMock.expectOne((req) => req.url === SERVICES_URL).flush(page([servicio(7)]));

      const firstPageReq = httpMock.expectOne((req) => req.url === ESTABLISHMENTS_URL);
      expect(firstPageReq.request.params.get('page')).toBe('0');
      firstPageReq.flush(page([establishment(1)], { number: 0, last: false, totalPages: 2, totalElements: 2 }));

      // The old `getAll(0, 100)` never issued this second request — a sede
      // past the first page used to just vanish from this filter's options.
      const secondPageReq = httpMock.expectOne((req) => req.url === ESTABLISHMENTS_URL);
      expect(secondPageReq.request.params.get('page')).toBe('1');
      secondPageReq.flush(page([establishment(2)], { number: 1, last: true }));
      fixture.detectChanges();

      fixture.componentInstance.openAssignTurnModal();
      httpMock.expectOne((req) => req.url === SCHEDULES_URL).flush(page([]));
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Sede 1');
      expect(text).toContain('Sede 2');
      expect(text).not.toContain('catálogo completo de sedes');
    });

    it('fetches a second page of services when the first reports more than one page, and both stay usable', () => {
      const fixture = TestBed.createComponent(PatientDetailComponent);
      fixture.detectChanges();

      httpMock.expectOne(PATIENTS_URL).flush(patient());
      httpMock.expectOne((req) => req.url === TURNS_URL).flush(page<Turn>([]));
      httpMock.expectOne((req) => req.url === ESTABLISHMENTS_URL).flush(page([establishment(1)]));

      const firstPageReq = httpMock.expectOne((req) => req.url === SERVICES_URL);
      firstPageReq.flush(page([servicio(7)], { number: 0, last: false, totalPages: 2, totalElements: 2 }));

      const secondPageReq = httpMock.expectOne((req) => req.url === SERVICES_URL);
      expect(secondPageReq.request.params.get('page')).toBe('1');
      secondPageReq.flush(page([servicio(9)], { number: 1, last: true }));
      fixture.detectChanges();

      fixture.componentInstance.openAssignTurnModal();
      httpMock.expectOne((req) => req.url === SCHEDULES_URL).flush(page([]));
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Servicio 7');
      expect(text).toContain('Servicio 9');
    });

    it('flags the catalog as incomplete and warns in the assign-turn modal when a later page fails', () => {
      const fixture = TestBed.createComponent(PatientDetailComponent);
      fixture.detectChanges();

      httpMock.expectOne(PATIENTS_URL).flush(patient());
      httpMock.expectOne((req) => req.url === TURNS_URL).flush(page<Turn>([]));
      httpMock.expectOne((req) => req.url === SERVICES_URL).flush(page([servicio(7)]));

      httpMock
        .expectOne((req) => req.url === ESTABLISHMENTS_URL)
        .flush(page([establishment(1)], { last: false, totalPages: 2 }));
      httpMock
        .expectOne((req) => req.url === ESTABLISHMENTS_URL)
        .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      fixture.componentInstance.openAssignTurnModal();
      httpMock.expectOne((req) => req.url === SCHEDULES_URL).flush(page([]));
      fixture.detectChanges();

      // Never silently show a subset: the first page's sede must still be
      // usable, but the modal must say the catalog is incomplete.
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Sede 1');
      expect(text).toContain('catálogo completo de sedes');
    });
  });

  it('preselects the reassignment filters from the turn being reassigned, and sends them as params', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    const turnToReassign: Turn = {
      id: 42,
      order: 3,
      status: 'TURN_WAITNG',
      createdAt: '2026-08-24T10:00:00Z',
      schedule: {
        date: '2026-08-24',
        hour: '09:00',
        stablishment: establishment(2),
        service: servicio(7),
      },
    };

    component.openReassignModal(turnToReassign);

    // Behavioral assertion: the preselected sede/servicio actually reach the
    // backend as query params — not just internal form state.
    const req = httpMock.expectOne((req) => req.url === SCHEDULES_URL);
    expect(req.request.params.get('stablishmentId')).toBe('2');
    expect(req.request.params.get('serviceId')).toBe('7');
    req.flush(page([]));
  });

  it('shows a "Registrar historia clínica" link instead of "Sin acciones" on a TURN_TREATED row', () => {
    const fixture = TestBed.createComponent(PatientDetailComponent);
    fixture.detectChanges();

    const treatedTurn: Turn = {
      id: 55,
      order: 5,
      status: 'TURN_TREATED',
      createdAt: '2026-08-20T09:00:00Z',
      schedule: { date: '2026-08-20', hour: '09:00', stablishment: establishment(1), service: servicio(7) },
    };

    httpMock.expectOne(PATIENTS_URL).flush(patient());
    httpMock.expectOne((req) => req.url === TURNS_URL).flush(page([treatedTurn]));
    httpMock.expectOne((req) => req.url === ESTABLISHMENTS_URL).flush(page([]));
    httpMock.expectOne((req) => req.url === SERVICES_URL).flush(page([]));
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('tbody tr') as HTMLElement;
    expect(row.textContent).toContain('Registrar historia clínica');
    expect(row.textContent).not.toContain('Sin acciones');

    const link = row.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toContain('/admin/pacientes/historial-clinico');
    expect(link.getAttribute('href')).toContain('turnId=55');
  });

  it('renders quick links to historial clínico, recetas and auditoría scoped to this patient', () => {
    const fixture = create();

    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    const historyLink = links.find((a) => a.textContent?.trim() === 'Historial clínico');
    const prescriptionsLink = links.find((a) => a.textContent?.trim() === 'Recetas');
    const auditLink = links.find((a) => a.textContent?.trim() === 'Auditoría de accesos');

    expect(historyLink?.getAttribute('href')).toBe(`/admin/pacientes/historial-clinico?patientId=${PATIENT_ID}`);
    expect(prescriptionsLink?.getAttribute('href')).toBe(`/admin/pacientes/recetas?patientId=${PATIENT_ID}`);
    expect(auditLink?.getAttribute('href')).toBe(`/admin/reportes/auditoria-hc?patientId=${PATIENT_ID}`);
  });

  describe('Coberturas de Seguro tab (lazy: no request until opened)', () => {
    const COVERAGES_URL = `http://localhost:8080/api/patients/${PATIENT_ID}/coverages`;
    const COVERAGE_PLANS_URL = 'http://localhost:8080/api/coverage-plans';
    const PATIENT_COVERAGES_URL = 'http://localhost:8080/api/patient-coverages';

    function openCoberturasTab(fixture: Fixture): void {
      const tabButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => (b as HTMLElement).textContent?.trim() === 'Coberturas',
      ) as HTMLButtonElement;
      tabButton.click();
      fixture.detectChanges();
    }

    it('does not request coverage data on init — only the four turnos-tab requests fire', () => {
      // If loadCoverages()/loadCoveragePlansCatalog() fired eagerly, the afterEach
      // httpMock.verify() below would fail on an unflushed request.
      create();
    });

    it('loads and renders the patient coverage history when the Coberturas tab is opened', () => {
      const fixture = create();
      openCoberturasTab(fixture);

      httpMock.expectOne(COVERAGES_URL).flush([patientCoverage(1, { policyNumber: 'POL-1', active: true })]);
      httpMock.expectOne((r) => r.url === COVERAGE_PLANS_URL).flush(page([coveragePlan(1)]));
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('POL-1');
      expect(text).toContain('Activa');
      expect(text).toContain('IESS');
    });

    it('shows the empty state when the patient has no coverage registered yet', () => {
      const fixture = create();
      openCoberturasTab(fixture);

      httpMock.expectOne(COVERAGES_URL).flush([]);
      httpMock.expectOne((r) => r.url === COVERAGE_PLANS_URL).flush(page([]));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('no tiene ninguna cobertura de seguro registrada');
    });

    it('shows a clear, non-alarming explanation (not a generic error) when access is denied, e.g. for ROLE_DOCTOR', () => {
      const fixture = create();
      openCoberturasTab(fixture);

      // The coarse Spring Security gate rejects ROLE_DOCTOR on this staff-only route with a bare 403.
      httpMock.expectOne(COVERAGES_URL).flush(null, { status: 403, statusText: 'Forbidden' });
      httpMock.expectOne((r) => r.url === COVERAGE_PLANS_URL).flush(page([]));
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('No tienes permisos para ver ni gestionar la cobertura de seguro');
      expect(text).toContain('rol Doctor no tiene acceso a esta información por diseño');
      // A denial does not also offer the write action that would just be denied again:
      expect(text).not.toContain('Asignar Cobertura');
    });

    it('surfaces that the previous active coverage was deactivated when a new one is assigned as active', () => {
      const fixture = create();
      const component = fixture.componentInstance;
      openCoberturasTab(fixture);

      httpMock.expectOne(COVERAGES_URL).flush([patientCoverage(1, { policyNumber: 'POL-OLD', active: true })]);
      httpMock.expectOne((r) => r.url === COVERAGE_PLANS_URL).flush(page([coveragePlan(1)]));
      fixture.detectChanges();

      component.openAssignCoverageModal();
      fixture.detectChanges();

      const planSelect = fixture.nativeElement.querySelector('#coveragePlan') as HTMLSelectElement;
      planSelect.value = '1';
      planSelect.dispatchEvent(new Event('change'));

      const policyInput = fixture.nativeElement.querySelector('#coveragePolicyNumber') as HTMLInputElement;
      policyInput.value = 'POL-NEW';
      policyInput.dispatchEvent(new Event('input'));

      const validFromInput = fixture.nativeElement.querySelector('#coverageValidFrom') as HTMLInputElement;
      validFromInput.value = '2026-08-25';
      validFromInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      // "Marcar como cobertura ACTIVA" defaults to checked for a brand-new assignment.
      (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

      const createReq = httpMock.expectOne(PATIENT_COVERAGES_URL);
      expect(createReq.request.method).toBe('POST');
      expect(createReq.request.body).toEqual({
        patient: { uuid: PATIENT_ID },
        plan: { id: 1 },
        policyNumber: 'POL-NEW',
        validFrom: '2026-08-25',
        validUntil: null,
        active: true,
      });
      createReq.flush(patientCoverage(2, { policyNumber: 'POL-NEW', active: true }));

      httpMock.expectOne(COVERAGES_URL).flush([
        patientCoverage(1, { policyNumber: 'POL-OLD', active: false }),
        patientCoverage(2, { policyNumber: 'POL-NEW', active: true }),
      ]);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('POL-NEW');
      expect(text).toContain('La cobertura anterior (póliza POL-OLD) fue desactivada automáticamente');
      // Renders whatever the server returns rather than assuming the invariant: both rows show their OWN state.
      expect(text).toContain('Activa');
      expect(text).toContain('Inactiva');
    });
  });
});
