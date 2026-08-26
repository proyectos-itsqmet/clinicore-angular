import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { Page, Servicio } from '../../../core/models';
import { PreciosDescuentosListComponent } from './precios-descuentos-list.component';

const API_URL = '/api/services';

function servicio(id: number, price: number, discount = 0): Servicio {
  return { id, name: `Consulta ${id}`, price, discount, netPrice: price - discount };
}

function page(content: Servicio[], overrides: Partial<Page<Servicio>> = {}): Page<Servicio> {
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

type Fixture = ReturnType<typeof TestBed.createComponent<PreciosDescuentosListComponent>>;

describe('PreciosDescuentosListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function create(): Fixture {
    const fixture = TestBed.createComponent(PreciosDescuentosListComponent);
    fixture.detectChanges();
    return fixture;
  }

  function findButton(fixture: Fixture, text: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLElement).textContent?.trim() === text,
    ) as HTMLButtonElement;
  }

  it('shows a loading state before the first page resolves', () => {
    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain('Cargando');
    httpMock.expectOne((r) => r.url === API_URL).flush(page([]));
  });

  it('shows the empty state when there are no services', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === API_URL).flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay servicios registrados');
  });

  it('shows the backend {message} error and stops loading when the list request fails', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === API_URL).flush({ message: 'Ocurrió un error interno en el servidor' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ocurrió un error interno en el servidor');
    expect(fixture.nativeElement.textContent).not.toContain('Cargando');
  });

  it('renders the discount as an unambiguous fixed dollar amount, never a percentage', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === API_URL).flush(page([servicio(1, 100, 20), servicio(2, 80, 0)]));
    fixture.detectChanges();

    const rows = Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLTableRowElement[];
    expect(rows[0].textContent).toContain('-$20.00');
    expect(rows[0].textContent).not.toMatch(/20\s*%/);
    expect(rows[0].textContent).toContain('80.00'); // net price
    expect(rows[1].textContent).toContain('Sin descuento');
  });

  it('opens the edit modal prefilled with the current discount and a permanent fixed-amount-not-percentage warning', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === API_URL).flush(page([servicio(1, 100, 20)]));
    fixture.detectChanges();

    findButton(fixture, 'Editar descuento').click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#discountAmount') as HTMLInputElement;
    expect(input.value).toBe('20');
    expect(fixture.nativeElement.textContent).toMatch(/monto fijo/i);
    expect(fixture.nativeElement.textContent).toMatch(/no.*(un\s+)?porcentaje/i);
  });

  it('submits through the NARROW discount endpoint, never the full service update', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === API_URL).flush(page([servicio(1, 100, 20)]));
    fixture.detectChanges();

    findButton(fixture, 'Editar descuento').click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#discountAmount') as HTMLInputElement;
    input.value = '35';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    const req = httpMock.expectOne(`${API_URL}/1/discount`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ discount: 35 });
    req.flush(servicio(1, 100, 35));

    httpMock.expectOne((r) => r.url === API_URL).flush(page([servicio(1, 100, 35)]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('-$35.00');
    // Never a request to the full-update endpoint (which would silently overwrite name/price).
    httpMock.expectNone(`${API_URL}/1`);
  });

  it('rejects a negative discount client-side without sending a request', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === API_URL).flush(page([servicio(1, 100, 20)]));
    fixture.detectChanges();

    findButton(fixture, 'Editar descuento').click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#discountAmount') as HTMLInputElement;
    input.value = '-5';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toMatch(/no puede ser negativo/i);
    httpMock.expectNone(`${API_URL}/1/discount`);
  });

  it('shows a clear explanation when a write is rejected as a permission denial (non-admin role)', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === API_URL).flush(page([servicio(1, 100, 20)]));
    fixture.detectChanges();

    findButton(fixture, 'Editar descuento').click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    httpMock.expectOne(`${API_URL}/1/discount`).flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('solo un Administrador puede');
  });
});
