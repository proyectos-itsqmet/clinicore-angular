import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { Page, Promotion, Servicio } from '../../../core/models';
import { PreciosPromocionesListComponent } from './precios-promociones-list.component';

const SERVICIOS_URL = 'http://localhost:8080/api/services';
const PROMOTIONS_URL = 'http://localhost:8080/api/promotions';

const OVERLAP_MESSAGE =
  'Ya existe una promoción vigente para este servicio en ese rango de fechas. Ajuste las fechas o finalice la promoción existente antes de crear esta.';

function servicio(id: number, name: string, price = 100): Servicio {
  return { id, name, price };
}

function promotion(id: number, overrides: Partial<Promotion> = {}): Promotion {
  return {
    id,
    servicio: servicio(1, 'Blanqueamiento Dental'),
    name: `Promo ${id}`,
    discountType: 'PERCENTAGE',
    discountValue: 20,
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    currentlyActive: true,
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

type Fixture = ReturnType<typeof TestBed.createComponent<PreciosPromocionesListComponent>>;

describe('PreciosPromocionesListComponent', () => {
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
    return httpMock.expectOne((r) => r.url === PROMOTIONS_URL && r.params.get('size') === '10');
  }

  function create(opts: { servicios?: Servicio[]; promotions?: Promotion[] } = {}): Fixture {
    const fixture = TestBed.createComponent(PreciosPromocionesListComponent);
    fixture.detectChanges();

    expectCatalogReq().flush(page(opts.servicios ?? [servicio(1, 'Blanqueamiento Dental'), servicio(2, 'Limpieza Dental')]));
    expectListReq().flush(page(opts.promotions ?? []));
    fixture.detectChanges();

    return fixture;
  }

  function findButton(fixture: Fixture, text: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLElement).textContent?.trim() === text,
    ) as HTMLButtonElement;
  }

  function fillBaseForm(fixture: Fixture, overrides: { servicioId?: string; discountType?: string } = {}): void {
    const servicioSelect = fixture.nativeElement.querySelector('#promotionServicio') as HTMLSelectElement;
    servicioSelect.value = overrides.servicioId ?? '1';
    servicioSelect.dispatchEvent(new Event('change'));

    (fixture.nativeElement.querySelector('#promotionName') as HTMLInputElement).value = 'Verano Blanco';
    (fixture.nativeElement.querySelector('#promotionName') as HTMLInputElement).dispatchEvent(new Event('input'));

    const typeSelect = fixture.nativeElement.querySelector('#promotionDiscountType') as HTMLSelectElement;
    typeSelect.value = overrides.discountType ?? 'PERCENTAGE';
    typeSelect.dispatchEvent(new Event('change'));

    (fixture.nativeElement.querySelector('#promotionDiscountValue') as HTMLInputElement).value = '20';
    (fixture.nativeElement.querySelector('#promotionDiscountValue') as HTMLInputElement).dispatchEvent(new Event('input'));

    (fixture.nativeElement.querySelector('#promotionStartDate') as HTMLInputElement).value = '2026-08-01';
    (fixture.nativeElement.querySelector('#promotionStartDate') as HTMLInputElement).dispatchEvent(new Event('input'));

    (fixture.nativeElement.querySelector('#promotionEndDate') as HTMLInputElement).value = '2026-08-31';
    (fixture.nativeElement.querySelector('#promotionEndDate') as HTMLInputElement).dispatchEvent(new Event('input'));
  }

  it('shows a loading state before the first page resolves', () => {
    const fixture = TestBed.createComponent(PreciosPromocionesListComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando');

    expectCatalogReq().flush(page([]));
    expectListReq().flush(page([]));
  });

  it('shows the empty state when there are no promotions', () => {
    const fixture = create({ promotions: [] });

    expect(fixture.nativeElement.textContent).toContain('No hay promociones registradas');
  });

  it('shows the backend {message} error when the list request fails', () => {
    const fixture = TestBed.createComponent(PreciosPromocionesListComponent);
    fixture.detectChanges();

    expectCatalogReq().flush(page([]));
    expectListReq().flush({ message: 'Ocurrió un error interno en el servidor' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ocurrió un error interno en el servidor');
  });

  it('renders a percentage discount and a fixed-amount discount unambiguously, never conflated', () => {
    const fixture = create({
      promotions: [
        promotion(1, { discountType: 'PERCENTAGE', discountValue: 20 }),
        promotion(2, { discountType: 'FIXED_AMOUNT', discountValue: 15 }),
      ],
    });

    const rows = Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLTableRowElement[];
    expect(rows[0].textContent).toContain('20%');
    expect(rows[0].textContent).not.toContain('$20');
    expect(rows[1].textContent).toContain('$15.00');
    expect(rows[1].textContent).not.toMatch(/15\s*%/);
  });

  it('shows "Vigente ahora" only for currently active promotions', () => {
    const fixture = create({
      promotions: [promotion(1, { currentlyActive: true }), promotion(2, { currentlyActive: false })],
    });

    const rows = Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLTableRowElement[];
    expect(rows[0].textContent).toMatch(/vigente ahora/i);
    expect(rows[1].textContent).not.toMatch(/vigente ahora/i);
  });

  it('filters the list by servicio', () => {
    const fixture = create();

    const select = fixture.nativeElement.querySelector('select[name="promotionServicioFilter"]') as HTMLSelectElement;
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === PROMOTIONS_URL && r.params.get('size') === '10');
    expect(req.request.params.get('servicioId')).toBe('2');
    req.flush(page([]));
  });

  it('creates a promotion via POST /api/promotions/save with the exact payload', () => {
    const fixture = create();

    findButton(fixture, 'Nueva Promoción').click();
    fixture.detectChanges();
    fillBaseForm(fixture);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    const req = httpMock.expectOne(`${PROMOTIONS_URL}/save`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      servicio: { id: 1 },
      name: 'Verano Blanco',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    });
    req.flush(promotion(9, { name: 'Verano Blanco' }));

    expectListReq().flush(page([promotion(9, { name: 'Verano Blanco' })]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Verano Blanco');
  });

  it('rejects a percentage above 100 client-side, mirroring the backend bound', () => {
    const fixture = create();

    findButton(fixture, 'Nueva Promoción').click();
    fixture.detectChanges();
    fillBaseForm(fixture);
    (fixture.nativeElement.querySelector('#promotionDiscountValue') as HTMLInputElement).value = '150';
    (fixture.nativeElement.querySelector('#promotionDiscountValue') as HTMLInputElement).dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toMatch(/no puede superar 100/i);
    httpMock.expectNone(`${PROMOTIONS_URL}/save`);
  });

  it('edits a promotion, prefilling its fields, and submits via PUT /{id}', () => {
    const existing = promotion(7, {
      servicio: servicio(2, 'Limpieza Dental'),
      name: 'Promo Vieja',
      discountType: 'FIXED_AMOUNT',
      discountValue: 12,
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    });
    const fixture = create({ promotions: [existing] });

    findButton(fixture, 'Editar').click();
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('#promotionServicio') as HTMLSelectElement).value).toBe('2');
    expect((fixture.nativeElement.querySelector('#promotionName') as HTMLInputElement).value).toBe('Promo Vieja');
    expect((fixture.nativeElement.querySelector('#promotionDiscountType') as HTMLSelectElement).value).toBe('FIXED_AMOUNT');
    expect((fixture.nativeElement.querySelector('#promotionDiscountValue') as HTMLInputElement).value).toBe('12');

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    const req = httpMock.expectOne(`${PROMOTIONS_URL}/7`);
    expect(req.request.method).toBe('PUT');
    req.flush(existing);

    expectListReq().flush(page([existing]));
  });

  it('deletes a promotion after confirmation', () => {
    const fixture = create({ promotions: [promotion(3)] });

    findButton(fixture, 'Eliminar').click();
    fixture.detectChanges();
    findButton(fixture, 'Eliminar Promoción').click();

    const req = httpMock.expectOne(`${PROMOTIONS_URL}/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expectListReq().flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay promociones registradas');
  });

  it('shows a clear explanation when a write is rejected as a permission denial (non-admin role)', () => {
    const fixture = create();

    findButton(fixture, 'Nueva Promoción').click();
    fixture.detectChanges();
    fillBaseForm(fixture);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    httpMock.expectOne(`${PROMOTIONS_URL}/save`).flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('solo un Administrador puede');
  });

  it('surfaces the REAL backend overlap message AND names the specific conflicting promotion', () => {
    const fixture = create();

    findButton(fixture, 'Nueva Promoción').click();
    fixture.detectChanges();
    fillBaseForm(fixture);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    httpMock.expectOne(`${PROMOTIONS_URL}/save`).flush({ message: OVERLAP_MESSAGE }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    // The verbatim backend message is never swallowed into a generic fallback.
    expect(fixture.nativeElement.textContent).toContain(OVERLAP_MESSAGE);

    // The component fetches this servicio's promotions to find and name the conflict itself.
    const lookupReq = httpMock.expectOne((r) => r.url === PROMOTIONS_URL && r.params.get('servicioId') === '1');
    lookupReq.flush(
      page([
        promotion(20, { name: 'Descuento Vacaciones', startDate: '2026-07-15', endDate: '2026-08-15' }),
      ]),
    );
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Descuento Vacaciones');
    expect(text).toContain('2026-07-15');
    expect(text).toContain('2026-08-15');
  });
});
