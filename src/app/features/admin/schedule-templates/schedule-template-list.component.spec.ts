import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { AdminDoctor, Establishment, Page, ScheduleDTO, ScheduleTemplate, Servicio } from '../../../core/models';
import { ScheduleTemplateListComponent } from './schedule-template-list.component';

const ESTABLISHMENTS_URL = '/api/stablishments';
const DOCTORS_URL = '/api/doctors';
const TEMPLATES_URL = '/api/schedule-templates';
const SCHEDULES_URL = '/api/schedules';

function establishment(id: number, overrides: Partial<Establishment> = {}): Establishment {
  return { id, name: `Sede ${id}`, address: 'Av. Siempre Viva', ...overrides };
}

function servicio(id: number, overrides: Partial<Servicio> = {}): Servicio {
  return { id, name: `Servicio ${id}`, price: 20, ...overrides };
}

function doctor(uuid: string, overrides: Partial<AdminDoctor> = {}): AdminDoctor {
  return { uuid, email: `${uuid}@x.com`, firstName: 'Ana', lastName: 'Pérez', speciality: 'General', gender: 'F', ci: '0102030405', ...overrides };
}

function template(overrides: Partial<ScheduleTemplate> = {}): ScheduleTemplate {
  return {
    id: 1,
    stablishment: establishment(2),
    servicio: servicio(3),
    doctor: null,
    dayOfWeek: 'MONDAY',
    startTime: '08:00:00',
    endTime: '12:00:00',
    slotIntervalMinutes: 30,
    validFrom: '2026-01-01',
    validUntil: null,
    createdAt: '2026-08-24T10:00:00Z',
    ...overrides,
  };
}

function pageOf<T>(content: T[]): Page<T> {
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
  };
}

type Fixture = ReturnType<typeof TestBed.createComponent<ScheduleTemplateListComponent>>;

describe('ScheduleTemplateListComponent', () => {
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

  function expectEstablishmentsCatalogReq() {
    return httpMock.expectOne((r) => r.url === ESTABLISHMENTS_URL && r.params.get('size') === '100');
  }

  function expectDoctorsCatalogReq() {
    return httpMock.expectOne((r) => r.url === DOCTORS_URL && r.params.get('size') === '100');
  }

  function expectListReq() {
    return httpMock.expectOne((r) => r.url === TEMPLATES_URL);
  }

  function expectServicesForEstablishmentReq(estId: number) {
    return httpMock.expectOne((r) => r.url === `${ESTABLISHMENTS_URL}/${estId}/services` && r.params.get('size') === '100');
  }

  function create(opts: { establishments?: Establishment[]; doctors?: AdminDoctor[]; templates?: ScheduleTemplate[] } = {}): Fixture {
    const fixture = TestBed.createComponent(ScheduleTemplateListComponent);
    fixture.detectChanges();

    expectEstablishmentsCatalogReq().flush(pageOf(opts.establishments ?? [establishment(2)]));
    expectDoctorsCatalogReq().flush(pageOf(opts.doctors ?? [doctor('uuid-1')]));
    expectListReq().flush(pageOf(opts.templates ?? []));

    fixture.detectChanges();
    return fixture;
  }

  function findButton(fixture: Fixture, text: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLElement).textContent?.trim() === text,
    ) as HTMLButtonElement;
  }

  function findAllButtons(fixture: Fixture, text: string): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).filter(
      (button) => (button as HTMLElement).textContent?.trim() === text,
    ) as HTMLButtonElement[];
  }

  function setValue(el: HTMLInputElement | HTMLSelectElement, value: string, eventName: 'input' | 'change' = 'input'): void {
    el.value = value;
    el.dispatchEvent(new Event(eventName));
  }

  function id(fixture: Fixture, elementId: string) {
    return fixture.nativeElement.querySelector(`#${elementId}`);
  }

  it('renders the permanent notice that templates never touch already-generated schedules', () => {
    const fixture = create();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('SOLO la generación futura');
    expect(text).toContain('Calendario');
    expect(fixture.nativeElement.querySelector('[title]')).toBeFalsy();
  });

  it('shows a loading state before the list resolves', () => {
    const fixture = TestBed.createComponent(ScheduleTemplateListComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando');

    expectEstablishmentsCatalogReq().flush(pageOf([]));
    expectDoctorsCatalogReq().flush(pageOf([]));
    expectListReq().flush(pageOf([]));
  });

  it('shows the empty state when there are no templates', () => {
    const fixture = create({ templates: [] });

    expect(fixture.nativeElement.textContent).toContain('No hay plantillas de horario registradas');
  });

  it('shows the backend error message when the list fails to load', () => {
    const fixture = TestBed.createComponent(ScheduleTemplateListComponent);
    fixture.detectChanges();
    expectEstablishmentsCatalogReq().flush(pageOf([]));
    expectDoctorsCatalogReq().flush(pageOf([]));
    expectListReq().flush({ message: 'Ocurrió un error interno en el servidor' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ocurrió un error interno en el servidor');
  });

  it('renders a template row with establishment, service, doctor, day and time range', () => {
    const fixture = create({
      templates: [
        template({
          stablishment: establishment(2, { name: 'Sede Norte' }),
          servicio: servicio(3, { name: 'Consulta General' }),
          doctor: { uuid: 'uuid-1', firstName: 'Ana', lastName: 'Pérez' },
          dayOfWeek: 'MONDAY',
          startTime: '08:00:00',
          endTime: '12:00:00',
        }),
      ],
    });

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sede Norte');
    expect(text).toContain('Consulta General');
    expect(text).toContain('Ana Pérez');
    expect(text).toContain('Lunes');
    expect(text).toContain('08:00');
    expect(text).toContain('12:00');
  });

  it('renders "Cualquiera (pool)" for a template with no doctor assigned', () => {
    const fixture = create({ templates: [template({ doctor: null })] });

    expect(fixture.nativeElement.textContent).toContain('Cualquiera (pool)');
  });

  it('explains, permanently and near the day field, that one template is exactly one weekday', () => {
    const fixture = create();

    findButton(fixture, 'Nueva Plantilla').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('UN solo día de la semana');
  });

  it('creates a pool template (no doctor) via cascading establishment -> service selects, POSTing to /save', () => {
    const fixture = create({ establishments: [establishment(2, { name: 'Sede Norte' })] });

    findButton(fixture, 'Nueva Plantilla').click();
    fixture.detectChanges();

    setValue(id(fixture, 'templateStablishment'), '2', 'change');
    fixture.detectChanges();
    expectServicesForEstablishmentReq(2).flush(pageOf([servicio(3, { name: 'Consulta General' })]));
    fixture.detectChanges();

    setValue(id(fixture, 'templateService'), '3', 'change');
    setValue(id(fixture, 'templateDayOfWeek'), 'MONDAY', 'change');
    setValue(id(fixture, 'templateStartTime'), '08:00');
    setValue(id(fixture, 'templateEndTime'), '12:00');
    setValue(id(fixture, 'templateSlotInterval'), '30');
    setValue(id(fixture, 'templateValidFrom'), '2026-01-01');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    const req = httpMock.expectOne(`${TEMPLATES_URL}/save`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      stablishment: { id: 2 },
      servicio: { id: 3 },
      doctor: null,
      dayOfWeek: 'MONDAY',
      startTime: '08:00:00',
      endTime: '12:00:00',
      slotIntervalMinutes: 30,
      validFrom: '2026-01-01',
      validUntil: null,
    });

    req.flush(template({ id: 5, stablishment: establishment(2), servicio: servicio(3) }));
    expectListReq().flush(pageOf([template({ id: 5 })]));
  });

  it('includes the selected doctor when one (not the pool option) is chosen', () => {
    const fixture = create({
      establishments: [establishment(2)],
      doctors: [doctor('uuid-1', { firstName: 'Ana', lastName: 'Pérez' })],
    });

    findButton(fixture, 'Nueva Plantilla').click();
    fixture.detectChanges();

    setValue(id(fixture, 'templateStablishment'), '2', 'change');
    expectServicesForEstablishmentReq(2).flush(pageOf([servicio(3)]));
    fixture.detectChanges();

    setValue(id(fixture, 'templateService'), '3', 'change');
    setValue(id(fixture, 'templateDoctor'), 'uuid-1', 'change');
    setValue(id(fixture, 'templateDayOfWeek'), 'MONDAY', 'change');
    setValue(id(fixture, 'templateStartTime'), '08:00');
    setValue(id(fixture, 'templateEndTime'), '12:00');
    setValue(id(fixture, 'templateValidFrom'), '2026-01-01');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    const req = httpMock.expectOne(`${TEMPLATES_URL}/save`);
    expect(req.request.body.doctor).toEqual({ uuid: 'uuid-1' });

    req.flush(template());
    expectListReq().flush(pageOf([template()]));
  });

  it('allows submitting two BACK-TO-BACK templates (08-12 then 12-16) without any client-side overlap rejection', () => {
    const fixture = create({ establishments: [establishment(2)] });

    // First: 08:00-12:00
    findButton(fixture, 'Nueva Plantilla').click();
    fixture.detectChanges();
    setValue(id(fixture, 'templateStablishment'), '2', 'change');
    expectServicesForEstablishmentReq(2).flush(pageOf([servicio(3)]));
    fixture.detectChanges();
    setValue(id(fixture, 'templateService'), '3', 'change');
    setValue(id(fixture, 'templateDayOfWeek'), 'MONDAY', 'change');
    setValue(id(fixture, 'templateStartTime'), '08:00');
    setValue(id(fixture, 'templateEndTime'), '12:00');
    setValue(id(fixture, 'templateValidFrom'), '2026-01-01');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    httpMock.expectOne(`${TEMPLATES_URL}/save`).flush(template({ id: 10, startTime: '08:00:00', endTime: '12:00:00' }));
    expectListReq().flush(pageOf([template({ id: 10, startTime: '08:00:00', endTime: '12:00:00' })]));
    fixture.detectChanges();

    // Second, immediately back-to-back: 12:00-16:00 — must NOT be blocked client-side.
    findButton(fixture, 'Nueva Plantilla').click();
    fixture.detectChanges();
    setValue(id(fixture, 'templateStablishment'), '2', 'change');
    expectServicesForEstablishmentReq(2).flush(pageOf([servicio(3)]));
    fixture.detectChanges();
    setValue(id(fixture, 'templateService'), '3', 'change');
    setValue(id(fixture, 'templateDayOfWeek'), 'MONDAY', 'change');
    setValue(id(fixture, 'templateStartTime'), '12:00');
    setValue(id(fixture, 'templateEndTime'), '16:00');
    setValue(id(fixture, 'templateValidFrom'), '2026-01-01');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    const secondReq = httpMock.expectOne(`${TEMPLATES_URL}/save`);
    expect(secondReq.request.body.startTime).toBe('12:00:00');
    expect(secondReq.request.body.endTime).toBe('16:00:00');
    secondReq.flush(template({ id: 11, startTime: '12:00:00', endTime: '16:00:00' }));
    expectListReq().flush(pageOf([template({ id: 10 }), template({ id: 11 })]));
  });

  it('surfaces the backend overlap rejection verbatim (server-side, never a client-side guess)', () => {
    const fixture = create({ establishments: [establishment(2)] });

    findButton(fixture, 'Nueva Plantilla').click();
    fixture.detectChanges();
    setValue(id(fixture, 'templateStablishment'), '2', 'change');
    expectServicesForEstablishmentReq(2).flush(pageOf([servicio(3)]));
    fixture.detectChanges();
    setValue(id(fixture, 'templateService'), '3', 'change');
    setValue(id(fixture, 'templateDayOfWeek'), 'MONDAY', 'change');
    setValue(id(fixture, 'templateStartTime'), '08:00');
    setValue(id(fixture, 'templateEndTime'), '12:00');
    setValue(id(fixture, 'templateValidFrom'), '2026-01-01');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    httpMock.expectOne(`${TEMPLATES_URL}/save`).flush(
      {
        message:
          'Ya existe una plantilla de horario que se superpone en ese día y horario. Ajuste el horario o finalice la plantilla existente antes de crear esta.',
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ya existe una plantilla de horario que se superpone');
  });

  it('shows a clear explanation when a write is rejected as a permission denial', () => {
    const fixture = create({ establishments: [establishment(2)] });

    findButton(fixture, 'Nueva Plantilla').click();
    fixture.detectChanges();
    setValue(id(fixture, 'templateStablishment'), '2', 'change');
    expectServicesForEstablishmentReq(2).flush(pageOf([servicio(3)]));
    fixture.detectChanges();
    setValue(id(fixture, 'templateService'), '3', 'change');
    setValue(id(fixture, 'templateDayOfWeek'), 'MONDAY', 'change');
    setValue(id(fixture, 'templateStartTime'), '08:00');
    setValue(id(fixture, 'templateEndTime'), '12:00');
    setValue(id(fixture, 'templateValidFrom'), '2026-01-01');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    httpMock.expectOne(`${TEMPLATES_URL}/save`).flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('solo un Administrador puede crear, editar o eliminar plantillas de horario');
  });

  it('warns, at the point of editing, that already-generated schedules are unaffected, and PUTs the update', () => {
    const existing = template({ id: 7, stablishment: establishment(2), servicio: servicio(3), startTime: '08:00:00', endTime: '12:00:00' });
    const fixture = create({ establishments: [establishment(2)], templates: [existing] });

    findButton(fixture, 'Editar').click();
    fixture.detectChanges();
    expectServicesForEstablishmentReq(2).flush(pageOf([servicio(3)]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('NO cambiarán ni se eliminarán');
    expect(id(fixture, 'templateStartTime').value).toBe('08:00');
    expect(id(fixture, 'templateEndTime').value).toBe('12:00');

    setValue(id(fixture, 'templateEndTime'), '10:00');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    const req = httpMock.expectOne(`${TEMPLATES_URL}/7`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.endTime).toBe('10:00:00');

    req.flush({ ...existing, endTime: '10:00:00' });
    expectListReq().flush(pageOf([{ ...existing, endTime: '10:00:00' }]));
  });

  it('warns in the delete confirmation that already-generated schedules are unaffected, then DELETEs', () => {
    const existing = template({ id: 7 });
    const fixture = create({ templates: [existing] });

    findButton(fixture, 'Eliminar').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('NO afecta los horarios que ya se generaron');

    findButton(fixture, 'Eliminar Plantilla').click();

    const req = httpMock.expectOne(`${TEMPLATES_URL}/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expectListReq().flush(pageOf([]));
  });

  it('generates schedules from templates and reports how many were created', () => {
    const fixture = create({ establishments: [establishment(2)] });

    findButton(fixture, 'Generar Horarios').click();
    fixture.detectChanges();
    setValue(id(fixture, 'genStablishment'), '2', 'change');
    expectServicesForEstablishmentReq(2).flush(pageOf([servicio(3)]));
    fixture.detectChanges();
    setValue(id(fixture, 'genService'), '3', 'change');
    setValue(id(fixture, 'genFrom'), '2026-09-01');
    setValue(id(fixture, 'genTo'), '2026-09-07');
    fixture.detectChanges();

    findButton(fixture, 'Generar').click();

    const req = httpMock.expectOne(`${SCHEDULES_URL}/generate-from-template`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ stablishmentId: 2, serviceId: 3, from: '2026-09-01', to: '2026-09-07' });

    const generated: ScheduleDTO[] = [
      { id: 1, date: '2026-09-01', hour: '08:00:00' },
      { id: 2, date: '2026-09-02', hour: '08:00:00' },
    ];
    req.flush(generated);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Se generaron 2');
  });

  it('surfaces the real backend message verbatim when generation produces nothing for the whole period', () => {
    const fixture = create({ establishments: [establishment(2)] });

    findButton(fixture, 'Generar Horarios').click();
    fixture.detectChanges();
    setValue(id(fixture, 'genStablishment'), '2', 'change');
    expectServicesForEstablishmentReq(2).flush(pageOf([servicio(3)]));
    fixture.detectChanges();
    setValue(id(fixture, 'genService'), '3', 'change');
    setValue(id(fixture, 'genFrom'), '2026-09-01');
    setValue(id(fixture, 'genTo'), '2026-09-07');
    fixture.detectChanges();

    findButton(fixture, 'Generar').click();

    httpMock.expectOne(`${SCHEDULES_URL}/generate-from-template`).flush(
      {
        message:
          'No se pudo generar ningún horario en el período indicado: no hay una plantilla aplicable, ya existen los horarios o el período está bloqueado por feriados o ausencias registradas',
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudo generar ningún horario en el período indicado');
  });
});
