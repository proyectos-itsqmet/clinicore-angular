import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { Page, Servicio } from '../../../core/models';
import { PreciosCitasListComponent } from './precios-citas-list.component';

/** Same endpoint `administracion/especialidades` already reads — no new API. */
const API_URL = 'http://localhost:8080/api/services';

function servicio(id: number, price: number, discount = 0): Servicio {
  return { id, name: `Consulta ${id}`, price, discount };
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

type Fixture = ReturnType<typeof TestBed.createComponent<PreciosCitasListComponent>>;

describe('PreciosCitasListComponent', () => {
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
    const fixture = TestBed.createComponent(PreciosCitasListComponent);
    fixture.detectChanges();
    return fixture;
  }

  function rows(fixture: Fixture): HTMLTableRowElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tbody tr'));
  }

  it('shows a loading state before the first page resolves', () => {
    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain('Cargando');

    // Drain the in-flight request so `httpMock.verify()` does not fail.
    httpMock.expectOne((req) => req.url === API_URL).flush(page([servicio(1, 50)]));
  });

  /**
   * The one thing this view adds over `administracion/especialidades`: the
   * net price after discount, which that screen never computes.
   */
  it('renders price, discount and the computed final price per row', () => {
    const fixture = create();

    httpMock
      .expectOne((req) => req.url === API_URL)
      .flush(page([servicio(1, 100, 20), servicio(2, 80)]));
    fixture.detectChanges();

    const tableRows = rows(fixture);
    expect(tableRows.length).toBe(2);
    expect(tableRows[0].textContent).toContain('100.00');
    expect(tableRows[0].textContent).toContain('20.00');
    expect(tableRows[0].textContent).toContain('80.00');
    expect(tableRows[1].textContent).toContain('Sin descuento');
  });

  it('shows the empty state when the page has no content', () => {
    const fixture = create();

    httpMock.expectOne((req) => req.url === API_URL).flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay precios de citas registrados actualmente.');
  });

  it('shows an error message and stops loading when the request fails', () => {
    const fixture = create();

    httpMock.expectOne((req) => req.url === API_URL).error(new ProgressEvent('network error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los precios de citas.');
    expect(fixture.nativeElement.textContent).not.toContain('Cargando');
  });

  it('requests the next page when "Siguiente" is clicked', () => {
    const fixture = create();

    httpMock
      .expectOne((req) => req.url === API_URL)
      .flush(page([servicio(1, 50)], { first: true, last: false, totalPages: 2, totalElements: 11 }));
    fixture.detectChanges();

    const nextButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLElement).textContent?.trim() === 'Siguiente',
    ) as HTMLButtonElement;
    expect(nextButton.disabled).toBe(false);

    nextButton.click();
    fixture.detectChanges();

    const secondRequest = httpMock.expectOne((req) => req.url === API_URL);
    expect(secondRequest.request.params.get('page')).toBe('1');
    secondRequest.flush(page([servicio(2, 60)], { number: 1 }));
  });

  /** Points back at the canonical screen instead of duplicating edit logic. */
  it('links each row back to its record in administracion/especialidades', () => {
    const fixture = create();

    httpMock.expectOne((req) => req.url === API_URL).flush(page([servicio(7, 30)]));
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('tbody tr a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/admin/administracion/especialidades/7');
  });
});
