import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import type { Invoice } from '../../../core/models';
import { FacturaDetailComponent } from './factura-detail.component';

const INVOICE_ID = 5;
const INVOICE_URL = `/api/invoices/${INVOICE_ID}`;
const CLAIMS_URL = '/api/claims';

function baseInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: INVOICE_ID,
    patient: { uuid: 'patient-1', email: 'p@x.com', firstName: 'Juan', lastName: 'Perez', ci: '0102030405' },
    items: [
      {
        id: 1,
        sourceType: 'FREE_LINE',
        description: 'Consulta particular',
        amount: 137.77,
        insurerCoveredAmount: 37.77,
        patientResponsibleAmount: 100,
      },
    ],
    total: 137.77,
    balance: 137.77,
    status: 'ISSUED',
    issuedAt: '2026-08-24T10:00:00-05:00',
    payments: [],
    ...overrides,
  };
}

type Fixture = ReturnType<typeof TestBed.createComponent<FacturaDetailComponent>>;

describe('FacturaDetailComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: String(INVOICE_ID) }) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function create(invoice: Invoice = baseInvoice()): Fixture {
    const fixture = TestBed.createComponent(FacturaDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === INVOICE_URL).flush(invoice);
    fixture.detectChanges();
    return fixture;
  }

  it('shows a loading state before the invoice resolves', () => {
    const fixture = TestBed.createComponent(FacturaDetailComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cargando');
    httpMock.expectOne((r) => r.url === INVOICE_URL).flush(baseInvoice());
  });

  it('renders line item amounts EXACTLY as returned by the API — no recomputation from any pricing/catalog lookup', () => {
    const fixture = create();
    const text = fixture.nativeElement.textContent;

    // Distinctive, non-"round" amounts: if these were recomputed from a
    // catalog default they would not reproduce this exact split.
    expect(text).toContain('$137,77');
    expect(text).toContain('$37,77');
    expect(text).toContain('$100,00');
    // httpMock.verify() in afterEach proves no second (pricing/catalog) request was ever made.
  });

  it('renders the balance EXACTLY as given by the server, never as a client-side (total - payments) recomputation', () => {
    // Deliberately inconsistent with total-payments (100 - 30 = 70) so a
    // component that recomputed the balance itself would show $70,00 instead.
    const fixture = create(baseInvoice({ total: 100, balance: 75, status: 'PARTIALLY_PAID', payments: [{ id: 1, amount: 30, method: 'CASH' }] }));
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('$75,00');
    expect(text).not.toContain('$70,00');
  });

  it('has NO delete affordance anywhere on the page, including inside the payment/void dialogs', () => {
    const fixture = create();

    (Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) => (b as HTMLElement).textContent?.trim() === 'Registrar Pago') as HTMLButtonElement).click();
    fixture.detectChanges();
    (Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) => (b as HTMLElement).textContent?.trim() === 'Anular Factura') as HTMLButtonElement)?.click();
    fixture.detectChanges();

    const elements: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('button, a'));
    const hasDeleteAffordance = elements.some((el) => /eliminar|borrar/i.test(el.textContent ?? ''));
    expect(hasDeleteAffordance).toBe(false);
  });

  describe('registrar pago', () => {
    function openPaymentModal(fixture: Fixture): void {
      const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => (b as HTMLElement).textContent?.trim() === 'Registrar Pago',
      ) as HTMLButtonElement;
      button.click();
      fixture.detectChanges();
    }

    it('surfaces the server overpayment message VERBATIM, including the real balance it reports', () => {
      const fixture = create(baseInvoice({ balance: 75 }));
      openPaymentModal(fixture);

      const amountInput = fixture.nativeElement.querySelector('input[name="paymentAmount"]') as HTMLInputElement;
      amountInput.value = '200';
      amountInput.dispatchEvent(new Event('input'));

      const form = fixture.nativeElement.querySelector('form[name="registerPaymentForm"]') as HTMLFormElement;
      form.dispatchEvent(new Event('submit'));

      const req = httpMock.expectOne((r) => r.url === `${INVOICE_URL}/payments`);
      req.flush({ message: 'El monto excede el saldo pendiente ($75.00).' }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('El monto excede el saldo pendiente ($75.00).');
    });

    it('reloads the invoice (fresh balance/status/payments) after a successful payment', () => {
      const fixture = create(baseInvoice({ balance: 75, total: 137.77 }));
      openPaymentModal(fixture);

      const amountInput = fixture.nativeElement.querySelector('input[name="paymentAmount"]') as HTMLInputElement;
      amountInput.value = '75';
      amountInput.dispatchEvent(new Event('input'));

      const form = fixture.nativeElement.querySelector('form[name="registerPaymentForm"]') as HTMLFormElement;
      form.dispatchEvent(new Event('submit'));

      const createReq = httpMock.expectOne((r) => r.url === `${INVOICE_URL}/payments`);
      expect(createReq.request.body).toEqual({ amount: 75, method: 'CASH' });
      createReq.flush({ id: 1, amount: 75, method: 'CASH' });

      httpMock.expectOne((r) => r.url === INVOICE_URL).flush(baseInvoice({ balance: 0, status: 'PAID', payments: [{ id: 1, amount: 75, method: 'CASH' }] }));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('$0,00');
      expect(fixture.nativeElement.textContent).toContain('Pagada');
    });
  });

  describe('anular factura', () => {
    function openVoidModal(fixture: Fixture): void {
      const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => (b as HTMLElement).textContent?.trim() === 'Anular Factura',
      ) as HTMLButtonElement;
      button.click();
      fixture.detectChanges();
    }

    it('is disabled once the invoice is PAID — voiding a paid invoice is refused server-side', () => {
      const fixture = create(baseInvoice({ status: 'PAID', balance: 0 }));
      const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => (b as HTMLElement).textContent?.trim() === 'Anular Factura',
      ) as HTMLButtonElement;

      expect(button.disabled).toBe(true);
    });

    it('blocks submission with an empty reason — no HTTP call is made', () => {
      const fixture = create();
      openVoidModal(fixture);

      const form = fixture.nativeElement.querySelector('form[name="voidInvoiceForm"]') as HTMLFormElement;
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('El motivo de anulación es obligatorio');
    });

    it('PUTs the reason and reflects VOID status on success', () => {
      const fixture = create();
      openVoidModal(fixture);

      const reasonInput = fixture.nativeElement.querySelector('textarea[name="voidReason"]') as HTMLTextAreaElement;
      reasonInput.value = 'Factura duplicada por error de digitación';
      reasonInput.dispatchEvent(new Event('input'));

      const form = fixture.nativeElement.querySelector('form[name="voidInvoiceForm"]') as HTMLFormElement;
      form.dispatchEvent(new Event('submit'));

      const req = httpMock.expectOne((r) => r.url === `${INVOICE_URL}/void`);
      expect(req.request.body).toEqual({ reason: 'Factura duplicada por error de digitación' });
      req.flush(baseInvoice({ status: 'VOID', voidReason: 'Factura duplicada por error de digitación' }));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Anulada');
    });

    it('surfaces a clear permission message when a non-admin attempts to void (403)', () => {
      const fixture = create();
      openVoidModal(fixture);

      const reasonInput = fixture.nativeElement.querySelector('textarea[name="voidReason"]') as HTMLTextAreaElement;
      reasonInput.value = 'Intento sin permisos';
      reasonInput.dispatchEvent(new Event('input'));
      fixture.nativeElement.querySelector('form[name="voidInvoiceForm"]').dispatchEvent(new Event('submit'));

      httpMock.expectOne((r) => r.url === `${INVOICE_URL}/void`).flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('solo un Administrador');
    });
  });

  describe('presentar reclamo', () => {
    it('shows the action only when at least one line was insurer-covered', () => {
      const fixture = create(baseInvoice({ items: [{ sourceType: 'FREE_LINE', description: 'Sin cobertura', amount: 20 }] }));
      const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => (b as HTMLElement).textContent?.trim() === 'Presentar Reclamo',
      );
      expect(button).toBeUndefined();
    });

    it('POSTs { invoiceId } and shows a success message, without altering the invoice total/balance', () => {
      const fixture = create(baseInvoice({ total: 137.77, balance: 137.77 }));

      const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => (b as HTMLElement).textContent?.trim() === 'Presentar Reclamo',
      ) as HTMLButtonElement;
      button.click();

      const req = httpMock.expectOne((r) => r.url === CLAIMS_URL);
      expect(req.request.body).toEqual({ invoiceId: INVOICE_ID });
      req.flush({ id: 1, invoiceId: INVOICE_ID, status: 'SUBMITTED' });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Reclamo presentado');
      // The invoice's own total/balance text must be unchanged — a rejected/accepted claim never touches it.
      expect(fixture.nativeElement.textContent).toContain('$137,77');
    });
  });
});
