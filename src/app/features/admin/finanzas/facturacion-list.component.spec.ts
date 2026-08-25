import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { Invoice, Page, Patient } from '../../../core/models';
import { FacturacionListComponent } from './facturacion-list.component';

const INVOICES_URL = 'http://localhost:8080/api/invoices';
const PATIENTS_URL = 'http://localhost:8080/api/patients';

function patient(overrides: Partial<Patient> = {}): Patient {
  return { uuid: 'patient-1', email: 'p@x.com', firstName: 'Juan', lastName: 'Perez', ci: '0102030405', ...overrides };
}

function invoice(id: number, overrides: Partial<Invoice> = {}): Invoice {
  return {
    id,
    patient: patient(),
    items: [{ sourceType: 'FREE_LINE', description: 'Consulta', amount: 50 }],
    total: 50,
    balance: 50,
    status: 'ISSUED',
    issuedAt: '2026-08-24T10:00:00-05:00',
    ...overrides,
  };
}

function page(content: Invoice[], overrides: Partial<Page<Invoice>> = {}): Page<Invoice> {
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

function patientPage(content: Patient[]): Page<Patient> {
  return {
    content,
    empty: content.length === 0,
    first: true,
    last: true,
    number: 0,
    numberOfElements: content.length,
    size: 5,
    totalElements: content.length,
    totalPages: 1,
    pageable: {
      offset: 0,
      pageNumber: 0,
      pageSize: 5,
      paged: true,
      unpaged: false,
      sort: { empty: true, sorted: false, unsorted: true },
    },
    sort: { empty: true, sorted: false, unsorted: true },
  };
}

type Fixture = ReturnType<typeof TestBed.createComponent<FacturacionListComponent>>;

describe('FacturacionListComponent', () => {
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
    const fixture = TestBed.createComponent(FacturacionListComponent);
    fixture.detectChanges();
    return fixture;
  }

  function flushInvoices(result: Page<Invoice>): void {
    httpMock.expectOne((r) => r.url === INVOICES_URL).flush(result);
  }

  it('shows a loading state before the first page resolves', () => {
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Cargando');
    flushInvoices(page([]));
  });

  it('renders each invoice with patient name, formatted total/balance and status label — never recomputed', () => {
    const fixture = create();
    flushInvoices(page([invoice(1, { total: 137.5, balance: 137.5, status: 'ISSUED' })]));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Juan Perez');
    // es-EC currency format (comma decimal) — proves this is NOT Angular's DecimalPipe/CurrencyPipe (LOCALE_ID-dependent).
    expect(text).toContain('$137,50');
    expect(text).toContain('Emitida');
  });

  it('shows the empty state when there is no content', () => {
    const fixture = create();
    flushInvoices(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay facturas registradas.');
  });

  it('shows an error message and stops loading when the request fails', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === INVOICES_URL).flush({ message: 'Error de base de datos' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Error de base de datos');
    expect(fixture.nativeElement.textContent).not.toContain('Cargando');
  });

  it('has NO delete affordance anywhere on the invoice list — voiding is the only removal path, from the detail page', () => {
    const fixture = create();
    flushInvoices(page([invoice(1)]));
    fixture.detectChanges();

    const buttons: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('button, a'));
    const hasDeleteAffordance = buttons.some((el) => /eliminar|borrar/i.test(el.textContent ?? ''));
    expect(hasDeleteAffordance).toBe(false);
  });

  it('links each row to its detail route', () => {
    const fixture = create();
    flushInvoices(page([invoice(7)]));
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('tbody tr a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/admin/finanzas/facturacion/7');
  });

  it('re-queries with the status filter and resets to page 0', () => {
    const fixture = create();
    flushInvoices(page([invoice(1)]));
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select[name="facturaEstadoFilter"]') as HTMLSelectElement;
    select.value = 'PAID';
    select.dispatchEvent(new Event('change'));

    const req = httpMock.expectOne((r) => r.url === INVOICES_URL);
    expect(req.request.params.get('status')).toBe('PAID');
    expect(req.request.params.get('page')).toBe('0');
    req.flush(page([]));
  });

  it('requests the next page when "Siguiente" is clicked', () => {
    const fixture = create();
    flushInvoices(page([invoice(1)], { first: true, last: false, totalPages: 2, totalElements: 11 }));
    fixture.detectChanges();

    const nextButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLElement).textContent?.trim() === 'Siguiente',
    ) as HTMLButtonElement;
    expect(nextButton.disabled).toBe(false);
    nextButton.click();

    const req = httpMock.expectOne((r) => r.url === INVOICES_URL);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(page([invoice(2)], { number: 1 }));
  });

  describe('create invoice flow', () => {
    function openCreateModal(fixture: Fixture): void {
      flushInvoices(page([]));
      fixture.detectChanges();
      const openButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => (b as HTMLElement).textContent?.trim() === 'Nueva Factura',
      ) as HTMLButtonElement;
      openButton.click();
      fixture.detectChanges();
    }

    it('searches patients by name and lets the user pick one', () => {
      const fixture = create();
      openCreateModal(fixture);

      const nameInput = fixture.nativeElement.querySelector('input[name="patientSearchName"]') as HTMLInputElement;
      nameInput.value = 'Juan';
      nameInput.dispatchEvent(new Event('input'));

      const searchButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => (b as HTMLElement).textContent?.trim() === 'Buscar',
      ) as HTMLButtonElement;
      searchButton.click();

      const req = httpMock.expectOne((r) => r.url === PATIENTS_URL);
      expect(req.request.params.get('name')).toBe('Juan');
      req.flush(patientPage([patient()]));
      fixture.detectChanges();

      const pickButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => (b as HTMLElement).textContent?.trim() === 'Seleccionar',
      ) as HTMLButtonElement;
      pickButton.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Juan Perez');
    });

    it('shows an error message when the patient search request fails (never a silent empty result)', () => {
      const fixture = create();
      openCreateModal(fixture);

      const searchButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => (b as HTMLElement).textContent?.trim() === 'Buscar',
      ) as HTMLButtonElement;
      searchButton.click();

      httpMock.expectOne((r) => r.url === PATIENTS_URL).flush({ message: 'Error de servidor' }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Error de servidor');
    });

    it('blocks submission without a selected patient', () => {
      const fixture = create();
      openCreateModal(fixture);

      const amountInput = fixture.nativeElement.querySelector('input[name="lineAmount-0"]') as HTMLInputElement;
      amountInput.value = '50';
      amountInput.dispatchEvent(new Event('input'));
      const descInput = fixture.nativeElement.querySelector('input[name="lineDescription-0"]') as HTMLInputElement;
      descInput.value = 'Consulta';
      descInput.dispatchEvent(new Event('input'));

      const form = fixture.nativeElement.querySelector('form[name="createInvoiceForm"]') as HTMLFormElement;
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Selecciona un paciente');
    });

    it('submits a FREE_LINE item for the selected patient and reloads the list on success', () => {
      const fixture = create();
      openCreateModal(fixture);

      const nameInput = fixture.nativeElement.querySelector('input[name="patientSearchName"]') as HTMLInputElement;
      nameInput.value = 'Juan';
      nameInput.dispatchEvent(new Event('input'));
      (Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) => (b as HTMLElement).textContent?.trim() === 'Buscar') as HTMLButtonElement).click();
      httpMock.expectOne((r) => r.url === PATIENTS_URL).flush(patientPage([patient()]));
      fixture.detectChanges();
      (Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) => (b as HTMLElement).textContent?.trim() === 'Seleccionar') as HTMLButtonElement).click();
      fixture.detectChanges();

      const amountInput = fixture.nativeElement.querySelector('input[name="lineAmount-0"]') as HTMLInputElement;
      amountInput.value = '50';
      amountInput.dispatchEvent(new Event('input'));
      const descInput = fixture.nativeElement.querySelector('input[name="lineDescription-0"]') as HTMLInputElement;
      descInput.value = 'Consulta particular';
      descInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const form = fixture.nativeElement.querySelector('form[name="createInvoiceForm"]') as HTMLFormElement;
      form.dispatchEvent(new Event('submit'));

      const createReq = httpMock.expectOne((r) => r.url === INVOICES_URL && r.method === 'POST');
      expect(createReq.request.body.patient).toEqual({ uuid: 'patient-1' });
      expect(createReq.request.body.items).toEqual([{ sourceType: 'FREE_LINE', description: 'Consulta particular', amount: 50 }]);
      createReq.flush(invoice(9));

      // Reload of the list after a successful create.
      httpMock.expectOne((r) => r.url === INVOICES_URL && r.method === 'GET').flush(page([invoice(9)]));
    });
  });
});
