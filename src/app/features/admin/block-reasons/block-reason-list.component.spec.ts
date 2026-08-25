import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { BlockReason, Page } from '../../../core/models';
import { BlockReasonListComponent } from './block-reason-list.component';

const API_URL = 'http://localhost:8080/api/block-reasons';

function blockReason(id: number, description = `Motivo ${id}`): BlockReason {
  return { id, description };
}

function page(content: BlockReason[], overrides: Partial<Page<BlockReason>> = {}): Page<BlockReason> {
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

type Fixture = ReturnType<typeof TestBed.createComponent<BlockReasonListComponent>>;

describe('BlockReasonListComponent', () => {
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
    const fixture = TestBed.createComponent(BlockReasonListComponent);
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

  it('omits the description filter from the request when empty', () => {
    create();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.has('description')).toBe(false);
    req.flush(page([]));
  });

  it('reaches the request with the description filter when searching', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === API_URL).flush(page([]));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[name="blockReasonSearch"]') as HTMLInputElement;
    input.value = 'Feriado';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    findButton(fixture, 'Buscar').click();

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('description')).toBe('Feriado');
    req.flush(page([]));
  });

  it('shows the empty state when there are no block reasons', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === API_URL).flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay motivos registrados');
  });

  it('shows the backend {message} error and stops loading when the list request fails', () => {
    const fixture = create();
    httpMock
      .expectOne((r) => r.url === API_URL)
      .flush({ message: 'Error de validación en los datos enviados' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Error de validación en los datos enviados');
    expect(fixture.nativeElement.textContent).not.toContain('Cargando');
  });

  it('creates a block reason and reloads the list', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === API_URL).flush(page([]));
    fixture.detectChanges();

    findButton(fixture, 'Nuevo Motivo').click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#description') as HTMLInputElement;
    input.value = 'Feriado nacional';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );

    const createReq = httpMock.expectOne(`${API_URL}/save`);
    expect(createReq.request.body).toEqual({ description: 'Feriado nacional' });
    createReq.flush(blockReason(1, 'Feriado nacional'));

    httpMock.expectOne((r) => r.url === API_URL).flush(page([blockReason(1, 'Feriado nacional')]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.relative.z-50')).toBeFalsy();
    expect(fixture.nativeElement.textContent).toContain('Feriado nacional');
  });

  it('edits a block reason and reloads the list', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === API_URL).flush(page([blockReason(1, 'Original')]));
    fixture.detectChanges();

    findButton(fixture, 'Editar').click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#description') as HTMLInputElement;
    expect(input.value).toBe('Original');
    input.value = 'Actualizado';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );

    const updateReq = httpMock.expectOne(`${API_URL}/1`);
    expect(updateReq.request.method).toBe('PUT');
    updateReq.flush(blockReason(1, 'Actualizado'));

    httpMock.expectOne((r) => r.url === API_URL).flush(page([blockReason(1, 'Actualizado')]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Actualizado');
  });

  it('deletes a block reason after confirmation and reloads the list', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === API_URL).flush(page([blockReason(1)]));
    fixture.detectChanges();

    findButton(fixture, 'Eliminar').click();
    fixture.detectChanges();

    findButton(fixture, 'Eliminar Motivo').click();

    const deleteReq = httpMock.expectOne(`${API_URL}/1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    httpMock.expectOne((r) => r.url === API_URL).flush(page([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay motivos registrados');
  });

  it('shows the backend {message} error instead of a generic one when delete is blocked by a referencing record', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === API_URL).flush(page([blockReason(1)]));
    fixture.detectChanges();

    findButton(fixture, 'Eliminar').click();
    fixture.detectChanges();
    findButton(fixture, 'Eliminar Motivo').click();

    httpMock
      .expectOne(`${API_URL}/1`)
      .flush(
        { message: 'No se puede eliminar el motivo porque está asociado a uno o más feriados.' },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se puede eliminar el motivo porque está asociado');
  });
});
