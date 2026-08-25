import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { Page, Servicio, SessionPlan } from '../../../core/models';
import { PreciosSesionesListComponent } from './precios-sesiones-list.component';

const SERVICIOS_URL = 'http://localhost:8080/api/services';
const PLANS_URL = 'http://localhost:8080/api/session-plans';

function servicio(id: number, name: string, price: number, discount = 0): Servicio {
  return { id, name, price, discount, netPrice: price - discount };
}

function plan(id: number, overrides: Partial<SessionPlan> = {}): SessionPlan {
  return {
    id,
    servicio: servicio(1, 'Fisioterapia', 30),
    name: `Plan ${id}`,
    sessionCount: 10,
    price: 250,
    pricePerSession: 25,
    regularTotal: 300,
    savings: 50,
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

type Fixture = ReturnType<typeof TestBed.createComponent<PreciosSesionesListComponent>>;

describe('PreciosSesionesListComponent', () => {
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

  function expectCatalogReq() {
    return httpMock.expectOne((r) => r.url === SERVICIOS_URL && r.params.get('size') === '100');
  }

  function expectListReq() {
    return httpMock.expectOne((r) => r.url === PLANS_URL);
  }

  function create(opts: { servicios?: Servicio[]; plans?: SessionPlan[] } = {}): Fixture {
    const fixture = TestBed.createComponent(PreciosSesionesListComponent);
    fixture.detectChanges();

    expectCatalogReq().flush(page(opts.servicios ?? [servicio(1, 'Fisioterapia', 30), servicio(2, 'Odontología', 50, 5)]));
    expectListReq().flush(page(opts.plans ?? []));
    fixture.detectChanges();

    return fixture;
  }

  function findButton(fixture: Fixture, text: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLElement).textContent?.trim() === text,
    ) as HTMLButtonElement;
  }

  it('shows a loading state before the first page resolves', () => {
    const fixture = TestBed.createComponent(PreciosSesionesListComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando');

    expectCatalogReq().flush(page([]));
    expectListReq().flush(page([]));
  });

  it('shows the empty state when there are no session plans', () => {
    const fixture = create({ plans: [] });

    expect(fixture.nativeElement.textContent).toContain('No hay planes de sesiones registrados');
  });

  it('shows the backend {message} error when the list request fails', () => {
    const fixture = TestBed.createComponent(PreciosSesionesListComponent);
    fixture.detectChanges();

    expectCatalogReq().flush(page([]));
    expectListReq().flush({ message: 'Ocurrió un error interno en el servidor' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ocurrió un error interno en el servidor');
  });

  it('renders the catalog numbers (sessions, price per session, savings) without ever implying a per-patient balance', () => {
    const fixture = create({ plans: [plan(1, { sessionCount: 10, price: 250, pricePerSession: 25, regularTotal: 300, savings: 50 })] });

    const row = fixture.nativeElement.querySelector('tbody tr') as HTMLTableRowElement;
    expect(row.textContent).toContain('10'); // catálogo: 10 sesiones incluidas
    expect(row.textContent).toContain('250.00');
    expect(row.textContent).toContain('25.00');
    expect(row.textContent).toContain('50.00');

    // Scoped to the TABLE ROW itself: the one place a "4 of 10 remaining"-style
    // affordance would actually appear. The permanent banner is allowed (and
    // expected) to use this vocabulary to explicitly DENY that it exists.
    expect(row.textContent).not.toMatch(/restantes/i);
    expect(row.textContent).not.toMatch(/disponibles? para el paciente/i);
    expect(row.textContent).not.toMatch(/consumid/i);
    expect(row.textContent).not.toMatch(/\d+\s*de\s*\d+\s*sesiones/i); // "4 de 10 sesiones" shape
  });

  it('permanently states that this is a catalog with no per-patient consumption ledger', () => {
    const fixture = create();

    expect(fixture.nativeElement.textContent).toMatch(/no (lleva|registra|hay).*(consumo|consumidas|ledger)/i);
  });

  it('filters the list by servicio', () => {
    const fixture = create();

    const select = fixture.nativeElement.querySelector('select[name="sessionPlanServicioFilter"]') as HTMLSelectElement;
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === PLANS_URL);
    expect(req.request.params.get('servicioId')).toBe('2');
    req.flush(page([]));
  });

  it('creates a session plan via POST /api/session-plans/save', () => {
    const fixture = create();

    findButton(fixture, 'Nuevo Plan').click();
    fixture.detectChanges();

    const servicioSelect = fixture.nativeElement.querySelector('#sessionPlanServicio') as HTMLSelectElement;
    servicioSelect.value = '2';
    servicioSelect.dispatchEvent(new Event('change'));

    (fixture.nativeElement.querySelector('#sessionPlanName') as HTMLInputElement).value = 'Plan Odontología x8';
    (fixture.nativeElement.querySelector('#sessionPlanName') as HTMLInputElement).dispatchEvent(new Event('input'));

    (fixture.nativeElement.querySelector('#sessionPlanCount') as HTMLInputElement).value = '8';
    (fixture.nativeElement.querySelector('#sessionPlanCount') as HTMLInputElement).dispatchEvent(new Event('input'));

    (fixture.nativeElement.querySelector('#sessionPlanPrice') as HTMLInputElement).value = '320';
    (fixture.nativeElement.querySelector('#sessionPlanPrice') as HTMLInputElement).dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    const req = httpMock.expectOne(`${PLANS_URL}/save`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ servicio: { id: 2 }, name: 'Plan Odontología x8', sessionCount: 8, price: 320 });
    req.flush(plan(4, { servicio: servicio(2, 'Odontología', 50, 5), name: 'Plan Odontología x8', sessionCount: 8, price: 320 }));

    expectListReq().flush(page([plan(4, { name: 'Plan Odontología x8' })]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Plan Odontología x8');
  });

  it('rejects a session count that is not a positive integer', () => {
    const fixture = create();

    findButton(fixture, 'Nuevo Plan').click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('#sessionPlanName') as HTMLInputElement).value = 'Plan X';
    (fixture.nativeElement.querySelector('#sessionPlanName') as HTMLInputElement).dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('#sessionPlanCount') as HTMLInputElement).value = '0';
    (fixture.nativeElement.querySelector('#sessionPlanCount') as HTMLInputElement).dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('#sessionPlanPrice') as HTMLInputElement).value = '100';
    (fixture.nativeElement.querySelector('#sessionPlanPrice') as HTMLInputElement).dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toMatch(/al menos 1 sesión/i);
    httpMock.expectNone(`${PLANS_URL}/save`);
  });

  it('edits a session plan, prefilling its servicio and fields, and submits via PUT /{id}', () => {
    const existing = plan(6, { servicio: servicio(2, 'Odontología', 50, 5), name: 'Plan Viejo', sessionCount: 5, price: 200 });
    const fixture = create({ plans: [existing] });

    findButton(fixture, 'Editar').click();
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('#sessionPlanServicio') as HTMLSelectElement).value).toBe('2');
    expect((fixture.nativeElement.querySelector('#sessionPlanName') as HTMLInputElement).value).toBe('Plan Viejo');
    expect((fixture.nativeElement.querySelector('#sessionPlanCount') as HTMLInputElement).value).toBe('5');

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    const req = httpMock.expectOne(`${PLANS_URL}/6`);
    expect(req.request.method).toBe('PUT');
    req.flush(existing);

    expectListReq().flush(page([existing]));
  });

  it('deletes a session plan after confirmation', () => {
    const fixture = create({ plans: [plan(3)] });

    findButton(fixture, 'Eliminar').click();
    fixture.detectChanges();
    findButton(fixture, 'Eliminar Plan').click();

    const req = httpMock.expectOne(`${PLANS_URL}/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expectListReq().flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay planes de sesiones registrados');
  });

  it('shows a clear explanation when a write is rejected as a permission denial (non-admin role)', () => {
    const fixture = create();

    findButton(fixture, 'Nuevo Plan').click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('#sessionPlanName') as HTMLInputElement).value = 'X';
    (fixture.nativeElement.querySelector('#sessionPlanName') as HTMLInputElement).dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('#sessionPlanCount') as HTMLInputElement).value = '5';
    (fixture.nativeElement.querySelector('#sessionPlanCount') as HTMLInputElement).dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('#sessionPlanPrice') as HTMLInputElement).value = '100';
    (fixture.nativeElement.querySelector('#sessionPlanPrice') as HTMLInputElement).dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    httpMock.expectOne(`${PLANS_URL}/save`).flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('solo un Administrador puede');
  });
});
