import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import type { Encounter, Page, Patient, Turn } from '../../../core/models';
import { HistorialClinicoListComponent } from './historial-clinico-list.component';

const PATIENT_ID = 'patient-uuid-1';
const PATIENTS_URL = 'http://localhost:8080/api/patients';
const ENCOUNTERS_URL = `http://localhost:8080/api/patients/${PATIENT_ID}/encounters`;
const TURNS_BY_PATIENT_URL = `http://localhost:8080/api/turns/patient/${PATIENT_ID}`;

function patient(overrides: Partial<Patient> = {}): Patient {
  return { uuid: PATIENT_ID, email: 'ana@test.com', firstName: 'Ana', lastName: 'Lopez', ci: '0102030405', ...overrides };
}

function encounter(id: number, overrides: Partial<Encounter> = {}): Encounter {
  return {
    id,
    turnId: 100 + id,
    reasonForVisit: 'Dolor de cabeza',
    diagnosis: 'Migraña',
    clinicalNotes: 'Reposo indicado',
    createdAt: '2026-08-20T10:00:00Z',
    visitDate: '2026-08-20',
    doctorUuid: 'doctor-uuid-1',
    doctorFullName: 'Carlos Ruiz',
    ...overrides,
  };
}

function treatedTurn(id: number, overrides: Partial<Turn> = {}): Turn {
  return {
    id,
    order: id,
    status: 'TURN_TREATED',
    createdAt: '2026-08-20T09:00:00Z',
    patient: patient(),
    schedule: {
      date: '2026-08-20',
      hour: '09:00',
      doctor: { uuid: 'doctor-uuid-1', firstName: 'Carlos', lastName: 'Ruiz', speciality: 'Medicina General' } as never,
    } as never,
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

type Fixture = ReturnType<typeof TestBed.createComponent<HistorialClinicoListComponent>>;

describe('HistorialClinicoListComponent', () => {
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
    const fixture = TestBed.createComponent(HistorialClinicoListComponent);
    fixture.detectChanges();
    return fixture;
  }

  function findButton(fixture: Fixture, text: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find((button) =>
      (button as HTMLElement).textContent?.trim().includes(text),
    ) as HTMLButtonElement;
  }

  it('shows a patient search bar when no patientId arrives via query params', () => {
    const fixture = setup();

    expect(fixture.nativeElement.querySelector('#patientSearchName')).toBeTruthy();
    httpMock.expectNone(ENCOUNTERS_URL);
  });

  it('finds a patient by search and loads their clinical history on selection', () => {
    const fixture = setup();

    (fixture.nativeElement.querySelector('#patientSearchName') as HTMLInputElement).value = 'Ana';
    (fixture.nativeElement.querySelector('#patientSearchName') as HTMLInputElement).dispatchEvent(new Event('input'));
    findButton(fixture, 'Buscar paciente').click();

    httpMock.expectOne((r) => r.url === PATIENTS_URL).flush(page([patient()]));
    fixture.detectChanges();

    findButton(fixture, 'Ana Lopez').click();
    fixture.detectChanges();

    // selectPatient() already has the full Patient object from the search
    // results — no extra GET /api/patients/{id} round-trip is needed here.
    httpMock.expectOne((r) => r.url === ENCOUNTERS_URL).flush(page([encounter(1)]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Dolor de cabeza');
  });

  it('loads directly when patientId arrives via query params', () => {
    const fixture = setup({ patientId: PATIENT_ID });

    httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/${PATIENT_ID}`).flush(patient());
    httpMock.expectOne((r) => r.url === ENCOUNTERS_URL).flush(page([encounter(1)]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ana Lopez');
    expect(fixture.nativeElement.textContent).toContain('Migraña');
  });

  it('shows the empty state when the patient has no encounters', () => {
    const fixture = setup({ patientId: PATIENT_ID });
    httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/${PATIENT_ID}`).flush(patient());
    httpMock.expectOne((r) => r.url === ENCOUNTERS_URL).flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay historias clínicas registradas');
  });

  it('never renders a delete affordance anywhere on the screen (Encounter is a legal record)', () => {
    const fixture = setup({ patientId: PATIENT_ID });
    httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/${PATIENT_ID}`).flush(patient());
    httpMock.expectOne((r) => r.url === ENCOUNTERS_URL).flush(page([encounter(1)]));
    fixture.detectChanges();

    const deleteButtons = Array.from(fixture.nativeElement.querySelectorAll('button')).filter((b) =>
      (b as HTMLElement).textContent?.trim().match(/eliminar/i),
    );
    expect(deleteButtons.length).toBe(0);
  });

  it('registers a new encounter picked from the patient\'s TURN_TREATED turns', () => {
    const fixture = setup({ patientId: PATIENT_ID });
    httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/${PATIENT_ID}`).flush(patient());
    httpMock.expectOne((r) => r.url === ENCOUNTERS_URL).flush(page([]));
    fixture.detectChanges();

    findButton(fixture, 'Nueva Historia Clínica').click();
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url === TURNS_BY_PATIENT_URL && r.params.get('status') === 'TURN_TREATED')
      .flush(page([treatedTurn(55)], { last: true }));
    fixture.detectChanges();

    const turnSelect = fixture.nativeElement.querySelector('#encounterTurn') as HTMLSelectElement;
    turnSelect.value = '55';
    turnSelect.dispatchEvent(new Event('change'));

    (fixture.nativeElement.querySelector('#encounterReason') as HTMLInputElement).value = 'Chequeo general';
    (fixture.nativeElement.querySelector('#encounterReason') as HTMLInputElement).dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('#encounterDiagnosis') as HTMLInputElement).value = 'Sano';
    (fixture.nativeElement.querySelector('#encounterDiagnosis') as HTMLInputElement).dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    const createReq = httpMock.expectOne('http://localhost:8080/api/encounters');
    expect(createReq.request.body).toEqual({ turnId: 55, reasonForVisit: 'Chequeo general', diagnosis: 'Sano' });
    createReq.flush(encounter(1, { turnId: 55, reasonForVisit: 'Chequeo general', diagnosis: 'Sano' }));

    httpMock
      .expectOne((r) => r.url === ENCOUNTERS_URL)
      .flush(page([encounter(1, { turnId: 55, reasonForVisit: 'Chequeo general', diagnosis: 'Sano' })]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Chequeo general');
  });

  it('explains there are no eligible turns when the patient has none marked as TURN_TREATED', () => {
    const fixture = setup({ patientId: PATIENT_ID });
    httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/${PATIENT_ID}`).flush(patient());
    httpMock.expectOne((r) => r.url === ENCOUNTERS_URL).flush(page([]));
    fixture.detectChanges();

    findButton(fixture, 'Nueva Historia Clínica').click();
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === TURNS_BY_PATIENT_URL).flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('no tiene turnos');
    expect(findButton(fixture, 'Registrar Historia Clínica').disabled).toBe(true);
  });

  it('edits an encounter, echoing turnId back even though it is not user-editable', () => {
    const fixture = setup({ patientId: PATIENT_ID });
    httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/${PATIENT_ID}`).flush(patient());
    httpMock.expectOne((r) => r.url === ENCOUNTERS_URL).flush(page([encounter(1, { turnId: 77 })]));
    fixture.detectChanges();

    findButton(fixture, 'Editar').click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('#encounterDiagnosis') as HTMLInputElement).value = 'Migraña crónica';
    (fixture.nativeElement.querySelector('#encounterDiagnosis') as HTMLInputElement).dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    const updateReq = httpMock.expectOne('http://localhost:8080/api/encounters/1');
    expect(updateReq.request.method).toBe('PUT');
    expect(updateReq.request.body.turnId).toBe(77);
    expect(updateReq.request.body.diagnosis).toBe('Migraña crónica');
    updateReq.flush(encounter(1, { turnId: 77, diagnosis: 'Migraña crónica' }));

    httpMock.expectOne((r) => r.url === ENCOUNTERS_URL).flush(page([encounter(1, { turnId: 77, diagnosis: 'Migraña crónica' })]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Migraña crónica');
  });

  it('surfaces the exact backend business rule message on a failed creation, not a generic error', () => {
    const fixture = setup({ patientId: PATIENT_ID });
    httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/${PATIENT_ID}`).flush(patient());
    httpMock.expectOne((r) => r.url === ENCOUNTERS_URL).flush(page([]));
    fixture.detectChanges();

    findButton(fixture, 'Nueva Historia Clínica').click();
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === TURNS_BY_PATIENT_URL).flush(page([treatedTurn(55)], { last: true }));
    fixture.detectChanges();

    const turnSelect = fixture.nativeElement.querySelector('#encounterTurn') as HTMLSelectElement;
    turnSelect.value = '55';
    turnSelect.dispatchEvent(new Event('change'));
    (fixture.nativeElement.querySelector('#encounterReason') as HTMLInputElement).value = 'Chequeo';
    (fixture.nativeElement.querySelector('#encounterReason') as HTMLInputElement).dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('#encounterDiagnosis') as HTMLInputElement).value = 'Sano';
    (fixture.nativeElement.querySelector('#encounterDiagnosis') as HTMLInputElement).dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    httpMock
      .expectOne('http://localhost:8080/api/encounters')
      .flush({ message: 'Solo se puede registrar una historia clínica para un turno atendido' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Solo se puede registrar una historia clínica para un turno atendido');
  });

  it('renders a clear, non-generic explanation for a per-record permission denial (HTTP 400, not 403)', () => {
    const fixture = setup({ patientId: PATIENT_ID });
    httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/${PATIENT_ID}`).flush(patient());
    httpMock
      .expectOne((r) => r.url === ENCOUNTERS_URL)
      .flush({ message: 'Error de permisos: no tienes acceso al historial clínico' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Error de permisos: no tienes acceso al historial clínico');
    expect(text).not.toMatch(/^\s*error\s*$/i);
    expect(text.toLowerCase()).toContain('tratante');
  });

  it('preselects the turn passed via the turnId query param inside the create modal', () => {
    const fixture = setup({ patientId: PATIENT_ID, turnId: '55' });
    httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/${PATIENT_ID}`).flush(patient());
    httpMock.expectOne((r) => r.url === ENCOUNTERS_URL).flush(page([]));
    fixture.detectChanges();

    findButton(fixture, 'Nueva Historia Clínica').click();
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === TURNS_BY_PATIENT_URL)
      .flush(page([treatedTurn(55), treatedTurn(56)], { last: true }));
    fixture.detectChanges();

    const turnSelect = fixture.nativeElement.querySelector('#encounterTurn') as HTMLSelectElement;
    expect(turnSelect.value).toBe('55');
  });
});
