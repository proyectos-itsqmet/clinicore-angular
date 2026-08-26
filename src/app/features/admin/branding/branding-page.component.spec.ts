import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { BrandingPageComponent } from './branding-page.component';

const API_URL = '/api/branding';

type Fixture = ReturnType<typeof TestBed.createComponent<BrandingPageComponent>>;

describe('BrandingPageComponent', () => {
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

  function findButton(fixture: Fixture, text: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLElement).textContent?.trim() === text,
    ) as HTMLButtonElement;
  }

  function input(fixture: Fixture, id: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
  }

  function setValue(el: HTMLInputElement, value: string, eventName: 'input' | 'change' = 'input'): void {
    el.value = value;
    el.dispatchEvent(new Event(eventName));
  }

  it('shows a loading state before the GET resolves', () => {
    const fixture = TestBed.createComponent(BrandingPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando');

    httpMock.expectOne(API_URL).flush({});
  });

  it('shows the backend error message and a retry action when the GET fails', () => {
    const fixture = TestBed.createComponent(BrandingPageComponent);
    fixture.detectChanges();

    httpMock.expectOne(API_URL).flush({ message: 'Ocurrió un error interno en el servidor' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ocurrió un error interno en el servidor');
    expect(findButton(fixture, 'Reintentar')).toBeTruthy();
  });

  it('renders the empty state without inventing any field value when nothing is configured yet', () => {
    const fixture = TestBed.createComponent(BrandingPageComponent);
    fixture.detectChanges();

    httpMock.expectOne(API_URL).flush({});
    fixture.detectChanges();

    // Informational note about the STATE is fine; the form fields themselves must stay genuinely empty.
    expect(fixture.nativeElement.textContent).toContain('Aún no se ha configurado la identidad de la clínica');
    expect(input(fixture, 'brandingName').value).toBe('');
    expect(input(fixture, 'brandingPrimaryColor').value).toBe('');
    expect(input(fixture, 'brandingLogoUrl').value).toBe('');
  });

  it('populates the form from an already-configured branding', () => {
    const fixture = TestBed.createComponent(BrandingPageComponent);
    fixture.detectChanges();

    httpMock.expectOne(API_URL).flush({ id: 1, name: 'Clínica San Rafael', primaryColor: '#1A2B3C', email: 'contacto@sanrafael.ec' });
    fixture.detectChanges();

    expect(input(fixture, 'brandingName').value).toBe('Clínica San Rafael');
    expect(input(fixture, 'brandingPrimaryColor').value).toBe('#1A2B3C');
    expect(fixture.nativeElement.textContent).not.toContain('Aún no se ha configurado la identidad de la clínica');
  });

  it('requires a name before submitting (no HTTP call fires)', () => {
    const fixture = TestBed.createComponent(BrandingPageComponent);
    fixture.detectChanges();
    httpMock.expectOne(API_URL).flush({});
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('El nombre de la clínica es requerido');
    httpMock.expectNone((r) => r.method === 'PUT');
  });

  it('saves and round-trips exactly what was sent, including the hex color', () => {
    const fixture = TestBed.createComponent(BrandingPageComponent);
    fixture.detectChanges();
    httpMock.expectOne(API_URL).flush({});
    fixture.detectChanges();

    setValue(input(fixture, 'brandingName'), 'Clínica San Rafael');
    setValue(input(fixture, 'brandingPrimaryColor'), '#1A2B3C');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Clínica San Rafael', primaryColor: '#1A2B3C' });

    req.flush({ id: 1, name: 'Clínica San Rafael', primaryColor: '#1A2B3C', updatedAt: '2026-08-25T10:00:00Z' });
    fixture.detectChanges();

    // Round-trip proof: the value now on screen came back FROM the server response, not from local state re-used blindly.
    expect(input(fixture, 'brandingPrimaryColor').value).toBe('#1A2B3C');
    expect(input(fixture, 'brandingColorSwatch').value).toBe('#1a2b3c');
  });

  it('shows a clear explanation when the save is rejected as a permission denial', () => {
    const fixture = TestBed.createComponent(BrandingPageComponent);
    fixture.detectChanges();
    httpMock.expectOne(API_URL).flush({});
    fixture.detectChanges();

    setValue(input(fixture, 'brandingName'), 'Clínica San Rafael');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

    httpMock.expectOne(API_URL).flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('solo un Administrador puede editar la personalización');
  });
});
