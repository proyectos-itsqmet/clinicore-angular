import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { AccountingSummary, ClaimsSummary } from '../../../core/models';
import { ContabilidadComponent } from './contabilidad.component';

const SUMMARY_URL = '/api/accounting/summary';
const CLAIMS_SUMMARY_URL = '/api/accounting/claims-summary';

function summary(overrides: Partial<AccountingSummary> = {}): AccountingSummary {
  return {
    invoicedByStatus: [{ status: 'ISSUED', count: 3, totalAmount: 150 }],
    collectedByMethod: [{ method: 'CASH', count: 2, totalAmount: 100 }],
    outstandingNow: 500,
    ...overrides,
  };
}

function claimsSummary(overrides: Partial<ClaimsSummary> = {}): ClaimsSummary {
  return { claimsByStatus: [{ status: 'SUBMITTED', count: 1, totalAmount: 37.77 }], ...overrides };
}

type Fixture = ReturnType<typeof TestBed.createComponent<ContabilidadComponent>>;

describe('ContabilidadComponent', () => {
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

  function create(): Fixture {
    const fixture = TestBed.createComponent(ContabilidadComponent);
    fixture.detectChanges();
    return fixture;
  }

  function flushBoth(s: AccountingSummary = summary(), c: ClaimsSummary = claimsSummary()): void {
    httpMock.expectOne((r) => r.url === SUMMARY_URL).flush(s);
    httpMock.expectOne((r) => r.url === CLAIMS_SUMMARY_URL).flush(c);
  }

  it('shows a loading state before the summary resolves', () => {
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Generando');
    flushBoth();
  });

  it('renders invoiced-by-status and collected-by-method rows with formatted money', () => {
    const fixture = create();
    flushBoth();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Emitida');
    expect(text).toContain('$150,00');
    expect(text).toContain('Efectivo');
    expect(text).toContain('$100,00');
  });

  it('renders a real zero amount explicitly, distinct from an empty (no data) section', () => {
    const fixture = create();
    flushBoth(summary({ invoicedByStatus: [{ status: 'VOID', count: 2, totalAmount: 0 }] }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('$0,00');
  });

  it('shows an empty-state message (not a currency zero) when a section genuinely has no data', () => {
    const fixture = create();
    flushBoth(summary({ invoicedByStatus: [], collectedByMethod: [] }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay facturación registrada en este rango.');
    expect(fixture.nativeElement.textContent).toContain('No se registraron cobros en este rango.');
  });

  it('shows an error message and stops loading when the summary request fails', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === SUMMARY_URL).flush({ message: 'Rango de fechas inválido' }, { status: 400, statusText: 'Bad Request' });
    httpMock.expectOne((r) => r.url === CLAIMS_SUMMARY_URL).flush(claimsSummary());
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Rango de fechas inválido');
    expect(fixture.nativeElement.textContent).not.toContain('Generando');
  });

  it('shows an inline error for the claims summary without blocking the rest of the report', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === SUMMARY_URL).flush(summary());
    httpMock.expectOne((r) => r.url === CLAIMS_SUMMARY_URL).flush({ message: 'No se pudo calcular reclamos' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    // The rest of the report (invoiced-by-status) still renders.
    expect(fixture.nativeElement.textContent).toContain('$150,00');
    expect(fixture.nativeElement.textContent).toContain('No se pudo calcular reclamos');
  });

  it('renders claims-by-status rows from the claims summary', () => {
    const fixture = create();
    flushBoth();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Presentado');
    expect(fixture.nativeElement.textContent).toContain('$37,77');
  });

  describe('outstandingNow — deliberately NOT date-bound', () => {
    it('renders in its own section, separate from the date-filtered tables', () => {
      const fixture = create();
      flushBoth();
      fixture.detectChanges();

      const outstandingSection = Array.from(fixture.nativeElement.querySelectorAll('section, div')).find((el) =>
        (el as HTMLElement).textContent?.includes('Saldo Pendiente Actual'),
      ) as HTMLElement;
      expect(outstandingSection).toBeTruthy();
      expect(outstandingSection.textContent).toContain('$500,00');
      expect(outstandingSection.textContent?.toLowerCase()).toContain('no depende del rango');

      // Must NOT live inside the date-bound "invoiced by status" table.
      const invoicedTable = fixture.nativeElement.querySelector('table');
      expect(invoicedTable?.textContent).not.toContain('Saldo Pendiente Actual');
    });

    it('stays exactly what the server returns even when the period data changes between two different date ranges', () => {
      const fixture = create();
      flushBoth(summary({ outstandingNow: 500, invoicedByStatus: [{ status: 'ISSUED', count: 3, totalAmount: 150 }] }));
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('$500,00');

      const fromInput = fixture.nativeElement.querySelector('input#contabilidadDesde') as HTMLInputElement;
      fromInput.value = '2026-01-01';
      fromInput.dispatchEvent(new Event('input'));

      // Period-bound data changes completely for the new range...
      httpMock.expectOne((r) => r.url === SUMMARY_URL && r.params.get('from') === '2026-01-01').flush(
        summary({ outstandingNow: 500, invoicedByStatus: [{ status: 'PAID', count: 9, totalAmount: 9999 }] }),
      );
      httpMock.expectOne((r) => r.url === CLAIMS_SUMMARY_URL).flush(claimsSummary());
      fixture.detectChanges();

      // ...but outstandingNow (deliberately not period-bound server-side) is unchanged.
      const outstandingSection = Array.from(fixture.nativeElement.querySelectorAll('section, div')).find((el) =>
        (el as HTMLElement).textContent?.includes('Saldo Pendiente Actual'),
      ) as HTMLElement;
      expect(outstandingSection.textContent).toContain('$500,00');
      expect(fixture.nativeElement.textContent).toContain('$9.999,00');
    });
  });

  it('re-fetches both summaries with the new "from" when the date range changes', () => {
    const fixture = create();
    flushBoth();
    fixture.detectChanges();

    const fromInput = fixture.nativeElement.querySelector('input#contabilidadDesde') as HTMLInputElement;
    fromInput.value = '2026-08-01';
    fromInput.dispatchEvent(new Event('input'));

    const req = httpMock.expectOne((r) => r.url === SUMMARY_URL);
    expect(req.request.params.get('from')).toBe('2026-08-01');
    req.flush(summary());
    httpMock.expectOne((r) => r.url === CLAIMS_SUMMARY_URL).flush(claimsSummary());
  });
});
