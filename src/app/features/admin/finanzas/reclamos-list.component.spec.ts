import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { Claim, Page } from '../../../core/models';
import { ReclamosListComponent } from './reclamos-list.component';

const CLAIMS_URL = '/api/claims';

function claim(id: number, overrides: Partial<Claim> = {}): Claim {
  return {
    id,
    invoiceId: 5,
    insurerName: 'IESS',
    planName: 'Plan Oro',
    amountClaimed: 37.77,
    status: 'SUBMITTED',
    submittedAt: '2026-08-24T10:00:00-05:00',
    ...overrides,
  };
}

function page(content: Claim[], overrides: Partial<Page<Claim>> = {}): Page<Claim> {
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

type Fixture = ReturnType<typeof TestBed.createComponent<ReclamosListComponent>>;

describe('ReclamosListComponent', () => {
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
    const fixture = TestBed.createComponent(ReclamosListComponent);
    fixture.detectChanges();
    return fixture;
  }

  function flush(result: Page<Claim>): void {
    httpMock.expectOne((r) => r.url === CLAIMS_URL && r.method === 'GET').flush(result);
  }

  it('shows a loading state before the first page resolves', () => {
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Cargando');
    flush(page([]));
  });

  it('renders insurer, plan, formatted amount claimed and status label', () => {
    const fixture = create();
    flush(page([claim(1, { amountClaimed: 37.77 })]));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('IESS');
    expect(text).toContain('Plan Oro');
    expect(text).toContain('$37,77');
    expect(text).toContain('Presentado');
  });

  it('shows the empty state when there is no content', () => {
    const fixture = create();
    flush(page([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay reclamos registrados.');
  });

  it('shows an error message and stops loading when the request fails', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === CLAIMS_URL).flush({ message: 'Error de servidor' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Error de servidor');
    expect(fixture.nativeElement.textContent).not.toContain('Cargando');
  });

  it('has NO delete affordance anywhere — a claim has no @DeleteMapping at all', () => {
    const fixture = create();
    flush(page([claim(1, { status: 'SUBMITTED' }), claim(2, { status: 'PAID' })]));
    fixture.detectChanges();

    const elements: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('button, a'));
    expect(elements.some((el) => /eliminar|borrar/i.test(el.textContent ?? ''))).toBe(false);
  });

  it('re-queries with the status filter, resetting to page 0', () => {
    const fixture = create();
    flush(page([claim(1)]));
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select[name="reclamoEstadoFilter"]') as HTMLSelectElement;
    select.value = 'REJECTED';
    select.dispatchEvent(new Event('change'));

    const req = httpMock.expectOne((r) => r.url === CLAIMS_URL);
    expect(req.request.params.get('status')).toBe('REJECTED');
    expect(req.request.params.get('page')).toBe('0');
    req.flush(page([]));
  });

  it('a SUBMITTED claim shows Aceptar/Rechazar; a terminal claim (PAID) shows neither', () => {
    const fixture = create();
    flush(page([claim(1, { status: 'SUBMITTED' }), claim(2, { status: 'PAID' })]));
    fixture.detectChanges();

    const rows = Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLElement[];
    expect(rows[0].textContent).toContain('Aceptar');
    expect(rows[0].textContent).toContain('Rechazar');
    expect(rows[1].textContent).not.toContain('Aceptar');
    expect(rows[1].textContent).not.toContain('Rechazar');
    expect(rows[1].textContent).not.toContain('Marcar Pagado');
  });

  it('accepting a claim PUTs /accept and reloads the current page', () => {
    const fixture = create();
    flush(page([claim(1, { status: 'SUBMITTED' })]));
    fixture.detectChanges();

    const acceptButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).textContent?.trim() === 'Aceptar',
    ) as HTMLButtonElement;
    acceptButton.click();

    const req = httpMock.expectOne((r) => r.url === `${CLAIMS_URL}/1/accept`);
    expect(req.request.method).toBe('PUT');
    req.flush(claim(1, { status: 'ACCEPTED' }));

    flush(page([claim(1, { status: 'ACCEPTED' })]));
  });

  it('an ACCEPTED claim shows "Marcar Pagado", which PUTs /mark-paid', () => {
    const fixture = create();
    flush(page([claim(1, { status: 'ACCEPTED' })]));
    fixture.detectChanges();

    const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).textContent?.trim() === 'Marcar Pagado',
    ) as HTMLButtonElement;
    button.click();

    const req = httpMock.expectOne((r) => r.url === `${CLAIMS_URL}/1/mark-paid`);
    expect(req.request.method).toBe('PUT');
    req.flush(claim(1, { status: 'PAID' }));

    flush(page([claim(1, { status: 'PAID' })]));
  });

  describe('rechazar', () => {
    function openRejectModal(fixture: Fixture): void {
      const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => (b as HTMLElement).textContent?.trim() === 'Rechazar',
      ) as HTMLButtonElement;
      button.click();
      fixture.detectChanges();
    }

    it('requires a reason — blocks submission and matches the server-side validation message', () => {
      const fixture = create();
      flush(page([claim(1, { status: 'SUBMITTED' })]));
      fixture.detectChanges();
      openRejectModal(fixture);

      const form = fixture.nativeElement.querySelector('form[name="rejectClaimForm"]') as HTMLFormElement;
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('El motivo de rechazo es obligatorio');
    });

    it('PUTs the reason to /reject and reloads on success', () => {
      const fixture = create();
      flush(page([claim(1, { status: 'SUBMITTED' })]));
      fixture.detectChanges();
      openRejectModal(fixture);

      const textarea = fixture.nativeElement.querySelector('textarea[name="rejectReason"]') as HTMLTextAreaElement;
      textarea.value = 'Cobertura vencida a la fecha del turno';
      textarea.dispatchEvent(new Event('input'));

      const form = fixture.nativeElement.querySelector('form[name="rejectClaimForm"]') as HTMLFormElement;
      form.dispatchEvent(new Event('submit'));

      const req = httpMock.expectOne((r) => r.url === `${CLAIMS_URL}/1/reject`);
      expect(req.request.body).toEqual({ reason: 'Cobertura vencida a la fecha del turno' });
      req.flush(claim(1, { status: 'REJECTED', rejectionReason: 'Cobertura vencida a la fecha del turno' }));

      flush(page([claim(1, { status: 'REJECTED' })]));
    });
  });
});
