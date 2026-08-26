import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { Page, PackageItem, Servicio, ServicePackage } from '../../../core/models';
import { PreciosPaquetesListComponent } from './precios-paquetes-list.component';

const SERVICIOS_URL = '/api/services';
const PACKAGES_URL = '/api/packages';

function servicio(id: number, name: string, price: number, discount = 0): Servicio {
  return { id, name, price, discount, netPrice: price - discount };
}

function packageItem(id: number, item: Servicio, quantity: number): PackageItem {
  return { id, servicio: item, quantity };
}

function pkg(id: number, overrides: Partial<ServicePackage> = {}): ServicePackage {
  return {
    id,
    name: `Paquete ${id}`,
    description: null,
    price: 80,
    items: [packageItem(1, servicio(1, 'Limpieza Dental', 50), 2)],
    itemsTotal: 100,
    savings: 20,
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

type Fixture = ReturnType<typeof TestBed.createComponent<PreciosPaquetesListComponent>>;

describe('PreciosPaquetesListComponent', () => {
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
    return httpMock.expectOne((r) => r.url === PACKAGES_URL);
  }

  function create(opts: { servicios?: Servicio[]; packages?: ServicePackage[] } = {}): Fixture {
    const fixture = TestBed.createComponent(PreciosPaquetesListComponent);
    fixture.detectChanges();

    expectCatalogReq().flush(page(opts.servicios ?? [servicio(1, 'Limpieza Dental', 50), servicio(2, 'Blanqueamiento', 120, 10)]));
    expectListReq().flush(page(opts.packages ?? []));
    fixture.detectChanges();

    return fixture;
  }

  function findButton(fixture: Fixture, text: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLElement).textContent?.trim() === text,
    ) as HTMLButtonElement;
  }

  function findButtons(fixture: Fixture, text: string): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).filter(
      (button) => (button as HTMLElement).textContent?.trim() === text,
    ) as HTMLButtonElement[];
  }

  function itemRows(fixture: Fixture): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.package-item-row'));
  }

  it('shows a loading state before the first page resolves', () => {
    const fixture = TestBed.createComponent(PreciosPaquetesListComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando');

    expectCatalogReq().flush(page([]));
    expectListReq().flush(page([]));
  });

  it('shows the empty state when there are no packages', () => {
    const fixture = create({ packages: [] });

    expect(fixture.nativeElement.textContent).toContain('No hay paquetes registrados');
  });

  it('shows a real error message (not just a stuck loading state) when the servicios catalog fails to load entirely', () => {
    const fixture = TestBed.createComponent(PreciosPaquetesListComponent);
    fixture.detectChanges();

    expectCatalogReq().flush({ message: 'Ocurrió un error interno en el servidor' }, { status: 500, statusText: 'Server Error' });
    expectListReq().flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ocurrió un error interno en el servidor');
  });

  it('shows the backend {message} error when the list request fails', () => {
    const fixture = TestBed.createComponent(PreciosPaquetesListComponent);
    fixture.detectChanges();

    expectCatalogReq().flush(page([]));
    expectListReq().flush({ message: 'Ocurrió un error interno en el servidor' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ocurrió un error interno en el servidor');
  });

  it('shows the package price, the items total and the savings as three distinct values, never overwriting one with another', () => {
    const fixture = create({ packages: [pkg(1, { price: 80, itemsTotal: 100, savings: 20 })] });

    const row = fixture.nativeElement.querySelector('tbody tr') as HTMLTableRowElement;
    expect(row.textContent).toContain('80.00'); // precio del paquete (fijado por el admin)
    expect(row.textContent).toContain('100.00'); // total de los ítems por separado (calculado por backend)
    expect(row.textContent).toContain('20.00'); // ahorro
  });

  it('adds and removes item rows in the form, leaving the correct row (not stale data from the removed one)', () => {
    const fixture = create();

    findButton(fixture, 'Nuevo Paquete').click();
    fixture.detectChanges();

    findButton(fixture, 'Agregar Servicio').click();
    findButton(fixture, 'Agregar Servicio').click();
    fixture.detectChanges();

    let rows = itemRows(fixture);
    expect(rows.length).toBe(2);

    const firstSelect = rows[0].querySelector('select') as HTMLSelectElement;
    const firstQty = rows[0].querySelector('input[type="number"]') as HTMLInputElement;
    firstSelect.value = '1';
    firstSelect.dispatchEvent(new Event('change'));
    firstQty.value = '2';
    firstQty.dispatchEvent(new Event('input'));

    const secondSelect = rows[1].querySelector('select') as HTMLSelectElement;
    const secondQty = rows[1].querySelector('input[type="number"]') as HTMLInputElement;
    secondSelect.value = '2';
    secondSelect.dispatchEvent(new Event('change'));
    secondQty.value = '5';
    secondQty.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Remove the FIRST row.
    (rows[0].querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    rows = itemRows(fixture);
    expect(rows.length).toBe(1);
    const remainingSelect = rows[0].querySelector('select') as HTMLSelectElement;
    const remainingQty = rows[0].querySelector('input[type="number"]') as HTMLInputElement;
    // The surviving row must still carry servicio #2 / qty 5 — never the removed row's data.
    expect(remainingSelect.value).toBe('2');
    expect(remainingQty.value).toBe('5');
  });

  it('requires at least one item before allowing submit', () => {
    const fixture = create();

    findButton(fixture, 'Nuevo Paquete').click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('#packageName') as HTMLInputElement).value = 'Paquete Vacío';
    (fixture.nativeElement.querySelector('#packageName') as HTMLInputElement).dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('#packagePrice') as HTMLInputElement).value = '10';
    (fixture.nativeElement.querySelector('#packagePrice') as HTMLInputElement).dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toMatch(/al menos un servicio/i);
    httpMock.expectNone(`${PACKAGES_URL}/save`);
  });

  it('creates a package via POST /api/packages/save with its line items', () => {
    const fixture = create();

    findButton(fixture, 'Nuevo Paquete').click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('#packageName') as HTMLInputElement).value = 'Combo Dental';
    (fixture.nativeElement.querySelector('#packageName') as HTMLInputElement).dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('#packagePrice') as HTMLInputElement).value = '90';
    (fixture.nativeElement.querySelector('#packagePrice') as HTMLInputElement).dispatchEvent(new Event('input'));

    findButton(fixture, 'Agregar Servicio').click();
    fixture.detectChanges();

    const row = itemRows(fixture)[0];
    (row.querySelector('select') as HTMLSelectElement).value = '2';
    (row.querySelector('select') as HTMLSelectElement).dispatchEvent(new Event('change'));
    (row.querySelector('input[type="number"]') as HTMLInputElement).value = '3';
    (row.querySelector('input[type="number"]') as HTMLInputElement).dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    const req = httpMock.expectOne(`${PACKAGES_URL}/save`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Combo Dental',
      description: null,
      price: 90,
      items: [{ servicio: { id: 2 }, quantity: 3 }],
    });
    req.flush(pkg(9, { name: 'Combo Dental', price: 90, items: [packageItem(1, servicio(2, 'Blanqueamiento', 120, 10), 3)] }));

    expectListReq().flush(page([pkg(9, { name: 'Combo Dental' })]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Combo Dental');
  });

  it('edits a package, prefilling its existing items, and submits via PUT /{id}', () => {
    const existing = pkg(5, { items: [packageItem(11, servicio(1, 'Limpieza Dental', 50), 4)] });
    const fixture = create({ packages: [existing] });

    findButton(fixture, 'Editar').click();
    fixture.detectChanges();

    const rows = itemRows(fixture);
    expect(rows.length).toBe(1);
    expect((rows[0].querySelector('select') as HTMLSelectElement).value).toBe('1');
    expect((rows[0].querySelector('input[type="number"]') as HTMLInputElement).value).toBe('4');

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    const req = httpMock.expectOne(`${PACKAGES_URL}/5`);
    expect(req.request.method).toBe('PUT');
    req.flush(existing);

    expectListReq().flush(page([existing]));
  });

  it('deletes a package after confirmation', () => {
    const fixture = create({ packages: [pkg(3)] });

    findButton(fixture, 'Eliminar').click();
    fixture.detectChanges();
    findButtons(fixture, 'Eliminar Paquete')[0].click();

    const req = httpMock.expectOne(`${PACKAGES_URL}/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expectListReq().flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay paquetes registrados');
  });

  it('shows a clear explanation when a write is rejected as a permission denial (non-admin role)', () => {
    const fixture = create();

    findButton(fixture, 'Nuevo Paquete').click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('#packageName') as HTMLInputElement).value = 'X';
    (fixture.nativeElement.querySelector('#packageName') as HTMLInputElement).dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('#packagePrice') as HTMLInputElement).value = '10';
    (fixture.nativeElement.querySelector('#packagePrice') as HTMLInputElement).dispatchEvent(new Event('input'));
    findButton(fixture, 'Agregar Servicio').click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    httpMock.expectOne(`${PACKAGES_URL}/save`).flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('solo un Administrador puede');
  });
});
