import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import type { Encounter, Page, Patient, Prescription } from '../../../core/models';
import { RecetaListComponent } from './receta-list.component';

const PATIENT_ID = 'patient-uuid-1';
const PATIENTS_URL = '/api/patients';
const PRESCRIPTIONS_URL = `/api/patients/${PATIENT_ID}/prescriptions`;
const ENCOUNTERS_URL = `/api/patients/${PATIENT_ID}/encounters`;

function patient(overrides: Partial<Patient> = {}): Patient {
  return { uuid: PATIENT_ID, email: 'ana@test.com', firstName: 'Ana', lastName: 'Lopez', ci: '0102030405', ...overrides };
}

function encounter(id: number, overrides: Partial<Encounter> = {}): Encounter {
  return {
    id,
    turnId: 100 + id,
    reasonForVisit: 'Dolor de cabeza',
    diagnosis: 'Migraña',
    visitDate: '2026-08-20',
    doctorFullName: 'Carlos Ruiz',
    ...overrides,
  };
}

function prescription(id: number, overrides: Partial<Prescription> = {}): Prescription {
  return {
    id,
    encounterId: 1,
    notes: 'Tomar con alimentos',
    items: [{ medication: 'Ibuprofeno', dosage: '400mg', frequency: 'Cada 8 horas', duration: '5 días' }],
    createdAt: '2026-08-20T10:00:00Z',
    doctorFullName: 'Carlos Ruiz',
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

type Fixture = ReturnType<typeof TestBed.createComponent<RecetaListComponent>>;

describe('RecetaListComponent', () => {
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
    const fixture = TestBed.createComponent(RecetaListComponent);
    fixture.detectChanges();
    return fixture;
  }

  function findButton(fixture: Fixture, text: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find((button) =>
      (button as HTMLElement).textContent?.trim().includes(text),
    ) as HTMLButtonElement;
  }

  function setInput(fixture: Fixture, selector: string, value: string): void {
    const el = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
    el.value = value;
    el.dispatchEvent(new Event('input'));
  }

  it('shows a patient search bar when no patientId arrives via query params', () => {
    setup();
    httpMock.expectNone(PRESCRIPTIONS_URL);
  });

  it('loads directly when patientId arrives via query params', () => {
    const fixture = setup({ patientId: PATIENT_ID });
    httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/${PATIENT_ID}`).flush(patient());
    httpMock.expectOne((r) => r.url === PRESCRIPTIONS_URL).flush(page([prescription(1)]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ana Lopez');
    expect(fixture.nativeElement.textContent).toContain('Ibuprofeno');
  });

  it('shows the empty state when the patient has no prescriptions', () => {
    const fixture = setup({ patientId: PATIENT_ID });
    httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/${PATIENT_ID}`).flush(patient());
    httpMock.expectOne((r) => r.url === PRESCRIPTIONS_URL).flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay recetas registradas');
  });

  it('never renders an edit or delete affordance for a prescription record (immutable once issued)', () => {
    const fixture = setup({ patientId: PATIENT_ID });
    httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/${PATIENT_ID}`).flush(patient());
    httpMock.expectOne((r) => r.url === PRESCRIPTIONS_URL).flush(page([prescription(1)]));
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) => (b as HTMLElement).textContent?.trim());
    expect(buttons.some((t) => t?.match(/^editar$/i))).toBe(false);
    expect(buttons.some((t) => t?.match(/eliminar/i))).toBe(false);
    expect(buttons.some((t) => t?.match(/ver detalle/i))).toBe(true);
  });

  it('round-trips every line item of a multi-item prescription through create', () => {
    const fixture = setup({ patientId: PATIENT_ID });
    httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/${PATIENT_ID}`).flush(patient());
    httpMock.expectOne((r) => r.url === PRESCRIPTIONS_URL).flush(page([]));
    fixture.detectChanges();

    findButton(fixture, 'Nueva Receta').click();
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === ENCOUNTERS_URL).flush(page([encounter(1)], { last: true }));
    fixture.detectChanges();

    const encounterSelect = fixture.nativeElement.querySelector('#prescriptionEncounter') as HTMLSelectElement;
    encounterSelect.value = '1';
    encounterSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    setInput(fixture, '#itemMedication0', 'Ibuprofeno');
    setInput(fixture, '#itemDosage0', '400mg');
    setInput(fixture, '#itemFrequency0', 'Cada 8 horas');
    setInput(fixture, '#itemDuration0', '5 días');

    findButton(fixture, 'Agregar medicamento').click();
    fixture.detectChanges();

    setInput(fixture, '#itemMedication1', 'Paracetamol');
    setInput(fixture, '#itemDosage1', '500mg');
    setInput(fixture, '#itemFrequency1', 'Cada 6 horas');
    setInput(fixture, '#itemDuration1', '3 días');
    setInput(fixture, '#itemInstructions1', 'Solo si hay fiebre');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    const req = httpMock.expectOne('/api/prescriptions');
    expect(req.request.body.encounterId).toBe(1);
    expect(req.request.body.items).toEqual([
      { medication: 'Ibuprofeno', dosage: '400mg', frequency: 'Cada 8 horas', duration: '5 días', instructions: '' },
      { medication: 'Paracetamol', dosage: '500mg', frequency: 'Cada 6 horas', duration: '3 días', instructions: 'Solo si hay fiebre' },
    ]);
    req.flush(prescription(2, { encounterId: 1, items: req.request.body.items }));

    httpMock.expectOne((r) => r.url === PRESCRIPTIONS_URL).flush(page([prescription(2, { items: req.request.body.items })]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Paracetamol');
  });

  it('removes a line item and keeps the remaining ones in order, and disables removal at exactly one item', () => {
    const fixture = setup({ patientId: PATIENT_ID });
    httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/${PATIENT_ID}`).flush(patient());
    httpMock.expectOne((r) => r.url === PRESCRIPTIONS_URL).flush(page([]));
    fixture.detectChanges();

    findButton(fixture, 'Nueva Receta').click();
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === ENCOUNTERS_URL).flush(page([encounter(1)], { last: true }));
    fixture.detectChanges();

    findButton(fixture, 'Agregar medicamento').click();
    fixture.detectChanges();
    setInput(fixture, '#itemMedication0', 'Ibuprofeno');
    setInput(fixture, '#itemMedication1', 'Paracetamol');
    fixture.detectChanges();

    const removeButtons = () =>
      Array.from(fixture.nativeElement.querySelectorAll('button')).filter((b) => (b as HTMLElement).textContent?.trim() === 'Quitar');

    expect(removeButtons().length).toBe(2);
    (removeButtons()[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('#itemMedication0') as HTMLInputElement).value).toBe('Paracetamol');
    expect(removeButtons().length).toBe(1);
    expect((removeButtons()[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it('explains there are no encounters to attach a prescription to, and disables submit', () => {
    const fixture = setup({ patientId: PATIENT_ID });
    httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/${PATIENT_ID}`).flush(patient());
    httpMock.expectOne((r) => r.url === PRESCRIPTIONS_URL).flush(page([]));
    fixture.detectChanges();

    findButton(fixture, 'Nueva Receta').click();
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === ENCOUNTERS_URL).flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('no tiene consultas registradas');
    expect(findButton(fixture, 'Crear Receta').disabled).toBe(true);
  });

  it('opens a read-only detail and lets the doctor issue a correction (new prescription, never an edit)', () => {
    const fixture = setup({ patientId: PATIENT_ID });
    httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/${PATIENT_ID}`).flush(patient());
    httpMock.expectOne((r) => r.url === PRESCRIPTIONS_URL).flush(page([prescription(1)]));
    fixture.detectChanges();

    findButton(fixture, 'Ver detalle').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ibuprofeno');

    findButton(fixture, 'Emitir corrección').click();
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === ENCOUNTERS_URL).flush(page([encounter(1)], { last: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('creará una receta NUEVA');
    expect((fixture.nativeElement.querySelector('#itemMedication0') as HTMLInputElement).value).toBe('Ibuprofeno');
  });

  it('renders a clear, non-generic explanation for a per-record permission denial', () => {
    const fixture = setup({ patientId: PATIENT_ID });
    httpMock.expectOne((r) => r.url === `${PATIENTS_URL}/${PATIENT_ID}`).flush(patient());
    httpMock
      .expectOne((r) => r.url === PRESCRIPTIONS_URL)
      .flush({ message: 'Error de permisos: no tienes acceso al historial clínico' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Error de permisos: no tienes acceso al historial clínico');
    expect(text.toLowerCase()).toContain('tratante');
  });
});
