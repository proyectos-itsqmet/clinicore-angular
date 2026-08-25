import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { CoveragePlan, Insurer, Page } from '../../../core/models';
import { CoverageListComponent } from './coverage-list.component';

const INSURERS_URL = 'http://localhost:8080/api/insurers';
const PLANS_URL = 'http://localhost:8080/api/coverage-plans';

function insurer(id: number, overrides: Partial<Insurer> = {}): Insurer {
  return { id, name: `Aseguradora ${id}`, type: 'INSURER_PRIVATE', createdAt: '2026-08-24T10:00:00Z', ...overrides };
}

function plan(id: number, overrides: Partial<CoveragePlan> = {}): CoveragePlan {
  return {
    id,
    insurer: insurer(1),
    name: `Plan ${id}`,
    coveragePercentage: 80,
    copayAmount: null,
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

type Fixture = ReturnType<typeof TestBed.createComponent<CoverageListComponent>>;

describe('CoverageListComponent', () => {
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
    return httpMock.expectOne((r) => r.url === INSURERS_URL && r.params.get('size') === '100');
  }

  function expectInsurersListReq() {
    return httpMock.expectOne((r) => r.url === INSURERS_URL && r.params.get('size') === '10');
  }

  function expectPlansListReq() {
    return httpMock.expectOne((r) => r.url === PLANS_URL);
  }

  /** Boots the component and drains the three parallel ngOnInit requests with happy-path data. */
  function create(opts: { insurers?: Insurer[]; plans?: CoveragePlan[] } = {}): Fixture {
    const fixture = TestBed.createComponent(CoverageListComponent);
    fixture.detectChanges();

    const insurers = opts.insurers ?? [insurer(1)];
    expectCatalogReq().flush(page(insurers));
    expectInsurersListReq().flush(page(insurers));
    expectPlansListReq().flush(page(opts.plans ?? []));

    fixture.detectChanges();
    return fixture;
  }

  function findButton(fixture: Fixture, text: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLElement).textContent?.trim() === text,
    ) as HTMLButtonElement;
  }

  it('shows a loading state before the first page of aseguradoras resolves', () => {
    const fixture = TestBed.createComponent(CoverageListComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando aseguradoras');

    expectCatalogReq().flush(page([]));
    expectInsurersListReq().flush(page([]));
    expectPlansListReq().flush(page([]));
  });

  it('shows the empty state when there are no aseguradoras', () => {
    const fixture = create({ insurers: [] });

    expect(fixture.nativeElement.textContent).toContain('No hay aseguradoras registradas');
  });

  it('shows the backend {message} error when the aseguradoras list request fails', () => {
    const fixture = TestBed.createComponent(CoverageListComponent);
    fixture.detectChanges();

    expectCatalogReq().flush(page([]));
    expectInsurersListReq().flush({ message: 'Ocurrió un error interno en el servidor' }, { status: 500, statusText: 'Server Error' });
    expectPlansListReq().flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ocurrió un error interno en el servidor');
  });

  it('creates an insurer and reloads both the list and the catalog', () => {
    const fixture = create({ insurers: [] });

    findButton(fixture, 'Nueva Aseguradora').click();
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector('#insurerName') as HTMLInputElement;
    nameInput.value = 'IESS';
    nameInput.dispatchEvent(new Event('input'));

    const typeSelect = fixture.nativeElement.querySelector('#insurerType') as HTMLSelectElement;
    typeSelect.value = 'INSURER_PUBLIC';
    typeSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    const createReq = httpMock.expectOne(`${INSURERS_URL}/save`);
    expect(createReq.request.body).toEqual({ name: 'IESS', type: 'INSURER_PUBLIC' });
    createReq.flush(insurer(1, { name: 'IESS', type: 'INSURER_PUBLIC' }));

    expectInsurersListReq().flush(page([insurer(1, { name: 'IESS', type: 'INSURER_PUBLIC' })]));
    expectCatalogReq().flush(page([insurer(1, { name: 'IESS', type: 'INSURER_PUBLIC' })]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('IESS');
    expect(fixture.nativeElement.textContent).toContain('Pública');
  });

  it('edits an insurer via PUT /{id} and reloads the list', () => {
    const fixture = create({ insurers: [insurer(1, { name: 'Salud SA' })] });

    findButton(fixture, 'Editar').click();
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector('#insurerName') as HTMLInputElement;
    nameInput.value = 'Salud SA Actualizada';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    const updateReq = httpMock.expectOne(`${INSURERS_URL}/1`);
    expect(updateReq.request.method).toBe('PUT');
    updateReq.flush(insurer(1, { name: 'Salud SA Actualizada' }));

    expectInsurersListReq().flush(page([insurer(1, { name: 'Salud SA Actualizada' })]));
    expectCatalogReq().flush(page([insurer(1, { name: 'Salud SA Actualizada' })]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Salud SA Actualizada');
  });

  it('shows the backend real message when deleting an insurer is refused because it still has plans', () => {
    const fixture = create({ insurers: [insurer(1, { name: 'IESS' })] });

    findButton(fixture, 'Eliminar').click();
    fixture.detectChanges();
    findButton(fixture, 'Eliminar Aseguradora').click();

    const deleteReq = httpMock.expectOne(`${INSURERS_URL}/1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(
      { message: 'No se puede eliminar la aseguradora porque tiene planes de cobertura asociados. Elimine o reasigne esos planes antes de eliminarla.' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No se puede eliminar la aseguradora porque tiene planes de cobertura asociados.',
    );
    // Still inside the confirm modal, not a generic fallback:
    expect(fixture.nativeElement.textContent).not.toContain('Ocurrió un error al eliminar la aseguradora.');
  });

  it('shows a clear explanation when a write is rejected as a permission denial (non-admin role)', () => {
    const fixture = create({ insurers: [] });

    findButton(fixture, 'Nueva Aseguradora').click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('#insurerName') as HTMLInputElement).value = 'IESS';
    (fixture.nativeElement.querySelector('#insurerName') as HTMLInputElement).dispatchEvent(new Event('input'));
    const typeSelect = fixture.nativeElement.querySelector('#insurerType') as HTMLSelectElement;
    typeSelect.value = 'INSURER_PUBLIC';
    typeSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    // The coarse Spring Security gate rejects a non-ROLE_ADMIN write with a bare 403, no body.
    httpMock.expectOne(`${INSURERS_URL}/save`).flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('solo un Administrador puede crear, editar o eliminar');
  });

  describe('Planes de Cobertura tab', () => {
    it('switches tabs, loading the plans list', () => {
      const fixture = create({ insurers: [insurer(1)], plans: [plan(1)] });

      findButton(fixture, 'Planes de Cobertura').click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Plan 1');
      expect(fixture.nativeElement.textContent).not.toContain('No hay planes de cobertura registrados');
    });

    it('creates a coverage plan with a fixed copay, sending both the copay and the (ignored-for-billing) percentage', () => {
      const fixture = create({ insurers: [insurer(1, { name: 'IESS' })] });

      findButton(fixture, 'Planes de Cobertura').click();
      fixture.detectChanges();

      findButton(fixture, 'Nuevo Plan').click();
      fixture.detectChanges();

      const insurerSelect = fixture.nativeElement.querySelector('#planInsurer') as HTMLSelectElement;
      insurerSelect.value = '1';
      insurerSelect.dispatchEvent(new Event('change'));

      const nameInput = fixture.nativeElement.querySelector('#planName') as HTMLInputElement;
      nameInput.value = 'Plan Oro';
      nameInput.dispatchEvent(new Event('input'));

      const pctInput = fixture.nativeElement.querySelector('#planCoveragePercentage') as HTMLInputElement;
      pctInput.value = '0';
      pctInput.dispatchEvent(new Event('input'));

      const copayInput = fixture.nativeElement.querySelector('#planCopayAmount') as HTMLInputElement;
      copayInput.value = '10';
      copayInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

      const createReq = httpMock.expectOne(`${PLANS_URL}/save`);
      expect(createReq.request.body).toEqual({ insurer: { id: 1 }, name: 'Plan Oro', coveragePercentage: 0, copayAmount: 10 });
      createReq.flush(plan(1, { insurer: insurer(1, { name: 'IESS' }), name: 'Plan Oro', coveragePercentage: 0, copayAmount: 10 }));

      expectPlansListReq().flush(page([plan(1, { name: 'Plan Oro', coveragePercentage: 0, copayAmount: 10 })]));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Plan Oro');
      expect(fixture.nativeElement.textContent).toContain('Copago fijo de $10.00');
    });

    it('communicates the copay/percentage exclusivity in the rendered plan form, both permanently and live as copay is typed', () => {
      const fixture = create({ insurers: [insurer(1)] });

      findButton(fixture, 'Planes de Cobertura').click();
      fixture.detectChanges();
      findButton(fixture, 'Nuevo Plan').click();
      fixture.detectChanges();

      // Permanent hint, present before any input — not a tooltip.
      expect(fixture.nativeElement.textContent).toContain(
        'El copago fijo y el porcentaje de cobertura son EXCLUYENTES para el cobro',
      );

      const pctInput = fixture.nativeElement.querySelector('#planCoveragePercentage') as HTMLInputElement;
      pctInput.value = '50';
      pctInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      // With no copay yet, the live preview reflects the percentage model.
      expect(fixture.nativeElement.textContent).toContain('50% de cobertura por coaseguro (sin copago fijo)');

      const copayInput = fixture.nativeElement.querySelector('#planCopayAmount') as HTMLInputElement;
      copayInput.value = '15';
      copayInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      // The moment a copay is entered, the live preview flips and says the percentage will be ignored.
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Copago fijo de $15.00');
      expect(text).toMatch(/50% de cobertura NO se aplica al cobro/);
    });

    it('shows the backend real message when deleting a plan is refused because patients still hold it', () => {
      const fixture = create({ insurers: [insurer(1)], plans: [plan(1, { name: 'Plan Oro' })] });

      findButton(fixture, 'Planes de Cobertura').click();
      fixture.detectChanges();

      findButton(fixture, 'Eliminar').click();
      fixture.detectChanges();
      findButton(fixture, 'Eliminar Plan').click();

      const deleteReq = httpMock.expectOne(`${PLANS_URL}/1`);
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush(
        { message: 'No se puede eliminar el plan porque tiene coberturas de pacientes asociadas. Reasigne o elimine esas coberturas antes de eliminarlo.' },
        { status: 400, statusText: 'Bad Request' },
      );
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        'No se puede eliminar el plan porque tiene coberturas de pacientes asociadas.',
      );
    });
  });
});
