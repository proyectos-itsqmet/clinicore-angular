import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { AdminModule } from '../../../core/models';
import { ModulesListComponent } from './modules-list.component';

const API_URL = '/api/admin-modules';

function adminModule(overrides: Partial<AdminModule> = {}): AdminModule {
  return { id: 1, moduleKey: 'dashboard', label: 'Dashboard', enabled: true, ...overrides };
}

type Fixture = ReturnType<typeof TestBed.createComponent<ModulesListComponent>>;

describe('ModulesListComponent', () => {
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

  function create(modules: AdminModule[]): Fixture {
    const fixture = TestBed.createComponent(ModulesListComponent);
    fixture.detectChanges();
    httpMock.expectOne(API_URL).flush(modules);
    fixture.detectChanges();
    return fixture;
  }

  function findButton(fixture: Fixture, text: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLElement).textContent?.trim() === text,
    ) as HTMLButtonElement;
  }

  it('renders the not-enforced-yet warning permanently, not tucked behind a tooltip', () => {
    const fixture = create([adminModule()]);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('no oculta el menú');
    expect(text).toContain('no bloquea la ruta');
    expect(text).toContain('no bloquea ningún endpoint');
    // Never inside a title attribute (tooltip) — it must be visible text content.
    expect(fixture.nativeElement.querySelector('[title]')).toBeFalsy();
  });

  it('shows the warning even while the list is loading', () => {
    const fixture = TestBed.createComponent(ModulesListComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('no oculta el menú');

    httpMock.expectOne(API_URL).flush([]);
  });

  it('shows a loading state before the GET resolves', () => {
    const fixture = TestBed.createComponent(ModulesListComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando');
    httpMock.expectOne(API_URL).flush([]);
  });

  it('shows the backend error message when the list fails to load', () => {
    const fixture = TestBed.createComponent(ModulesListComponent);
    fixture.detectChanges();

    httpMock.expectOne(API_URL).flush({ message: 'Ocurrió un error interno en el servidor' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ocurrió un error interno en el servidor');
  });

  it('renders every module with its current enabled state', () => {
    const fixture = create([adminModule({ moduleKey: 'precios', label: 'Precios', enabled: true }), adminModule({ id: 2, moduleKey: 'finanzas', label: 'Finanzas', enabled: false })]);

    expect(fixture.nativeElement.textContent).toContain('Precios');
    expect(fixture.nativeElement.textContent).toContain('Finanzas');
    expect(findButton(fixture, 'Inactivo')).toBeTruthy();
  });

  it('toggles a module off and reflects the new state from the response', () => {
    const fixture = create([adminModule({ moduleKey: 'precios', label: 'Precios', enabled: true })]);

    findButton(fixture, 'Activo').click();
    fixture.detectChanges();

    const req = httpMock.expectOne(`${API_URL}/precios`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ enabled: false });

    req.flush(adminModule({ moduleKey: 'precios', label: 'Precios', enabled: false }));
    fixture.detectChanges();

    expect(findButton(fixture, 'Inactivo')).toBeTruthy();
  });

  it("surfaces the backend's refusal verbatim when disabling the modulos module itself, and leaves it enabled", () => {
    const fixture = create([adminModule({ moduleKey: 'modulos', label: 'Módulos', enabled: true })]);

    findButton(fixture, 'Activo').click();

    const req = httpMock.expectOne(`${API_URL}/modulos`);
    req.flush({ message: 'El módulo de gestión de módulos no se puede deshabilitar' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('El módulo de gestión de módulos no se puede deshabilitar');
    // Still enabled: the rejected write must not be applied optimistically.
    expect(findButton(fixture, 'Activo')).toBeTruthy();
  });

  it('shows a clear explanation when toggling is rejected as a permission denial', () => {
    const fixture = create([adminModule({ moduleKey: 'precios', label: 'Precios', enabled: true })]);

    findButton(fixture, 'Activo').click();

    httpMock.expectOne(`${API_URL}/precios`).flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('solo un Administrador puede habilitar o deshabilitar módulos');
  });
});
