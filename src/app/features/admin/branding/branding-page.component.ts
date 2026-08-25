import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BrandingApiService } from '../../../core/api/branding-api.service';
import { extractApiErrorMessage, isPermissionDeniedError } from '../metrics-shared/turn-status.util';
import type { Branding, BrandingUpdate } from '../../../core/models';

const HEX_COLOR_PATTERN = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const SIX_DIGIT_HEX_PATTERN = /^#([A-Fa-f0-9]{6})$/;

/**
 * app-branding-page — "Personalización" (`GET`/`PUT /api/branding`).
 *
 * A STRAIGHTFORWARD SINGLETON, unlike `modulos`/`administracion/horarios`:
 * there is no working-vs-not-enforced gap to disclose here, just a form over
 * the one `Branding` row this clinic has. `GET` is public and returns a
 * near-empty body (`@JsonInclude(NON_NULL)`) before anything is configured —
 * this renders that state HONESTLY (a note about the STATE, never a fabricated
 * field value) instead of inventing a clinic name, logo or contact detail.
 *
 * Plain signals + manual `(input)`/`(change)` handlers, same idiom as
 * `coverage-list.component.ts`/`precios-descuentos-list.component.ts` — no
 * `[(ngModel)]` anywhere, so the `[ngModel]`+`NgForm`-inside-`<form>` silent
 * no-op this codebase has already hit once cannot happen here. `FormsModule`
 * is imported only for the `(ngSubmit)` output `<form>` exposes.
 */
@Component({
  selector: 'app-branding-page',
  imports: [FormsModule],
  templateUrl: './branding-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandingPageComponent implements OnInit {
  private readonly api = inject(BrandingApiService);

  protected readonly branding = signal<Branding | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly formLoading = signal<boolean>(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly formSuccess = signal<string | null>(null);
  protected readonly submitAttempted = signal<boolean>(false);

  protected readonly formName = signal<string>('');
  protected readonly formLogoUrl = signal<string>('');
  protected readonly formPrimaryColor = signal<string>('');
  protected readonly formSecondaryColor = signal<string>('');
  protected readonly formPhone = signal<string>('');
  protected readonly formEmergencyPhone = signal<string>('');
  protected readonly formWhatsapp = signal<string>('');
  protected readonly formEmail = signal<string>('');

  /** `true` once the backend has an actual configured identity — drives the empty-state note, never a fabricated field value. */
  protected readonly isConfigured = computed(() => !!this.branding()?.name);

  protected readonly nameValid = computed(() => !!this.formName().trim());
  protected readonly primaryColorValid = computed(() => this.isValidColorOrEmpty(this.formPrimaryColor()));
  protected readonly secondaryColorValid = computed(() => this.isValidColorOrEmpty(this.formSecondaryColor()));

  /** Native `<input type="color">` requires a full 6-digit lowercase hex — this is ONLY the picker widget's display value, never what gets submitted. */
  protected readonly primaryColorSwatchValue = computed(() => this.toSwatchValue(this.formPrimaryColor()));
  protected readonly secondaryColorSwatchValue = computed(() => this.toSwatchValue(this.formSecondaryColor()));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.get().subscribe({
      next: (branding) => {
        this.branding.set(branding);
        this.populateForm(branding);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudo cargar la personalización de la clínica.'));
        this.loading.set(false);
      },
    });
  }

  private populateForm(branding: Branding): void {
    this.formName.set(branding.name ?? '');
    this.formLogoUrl.set(branding.logoUrl ?? '');
    this.formPrimaryColor.set(branding.primaryColor ?? '');
    this.formSecondaryColor.set(branding.secondaryColor ?? '');
    this.formPhone.set(branding.phone ?? '');
    this.formEmergencyPhone.set(branding.emergencyPhone ?? '');
    this.formWhatsapp.set(branding.whatsapp ?? '');
    this.formEmail.set(branding.email ?? '');
  }

  private isValidColorOrEmpty(value: string): boolean {
    const trimmed = value.trim();
    return trimmed === '' || HEX_COLOR_PATTERN.test(trimmed);
  }

  private toSwatchValue(value: string): string {
    const trimmed = value.trim();
    return SIX_DIGIT_HEX_PATTERN.test(trimmed) ? trimmed.toLowerCase() : '#000000';
  }

  private describeWriteError(err: unknown, fallback: string): string {
    const message = extractApiErrorMessage(err, fallback);
    if (isPermissionDeniedError(err, message)) {
      return 'No tienes permisos para esta acción: solo un Administrador puede editar la personalización de la clínica.';
    }
    return message;
  }

  onNameInput(event: Event): void {
    this.formName.set((event.target as HTMLInputElement).value);
  }

  onLogoUrlInput(event: Event): void {
    this.formLogoUrl.set((event.target as HTMLInputElement).value);
  }

  onPrimaryColorInput(event: Event): void {
    this.formPrimaryColor.set((event.target as HTMLInputElement).value);
  }

  onPrimaryColorSwatchInput(event: Event): void {
    this.formPrimaryColor.set((event.target as HTMLInputElement).value);
  }

  onSecondaryColorInput(event: Event): void {
    this.formSecondaryColor.set((event.target as HTMLInputElement).value);
  }

  onSecondaryColorSwatchInput(event: Event): void {
    this.formSecondaryColor.set((event.target as HTMLInputElement).value);
  }

  onPhoneInput(event: Event): void {
    this.formPhone.set((event.target as HTMLInputElement).value);
  }

  onEmergencyPhoneInput(event: Event): void {
    this.formEmergencyPhone.set((event.target as HTMLInputElement).value);
  }

  onWhatsappInput(event: Event): void {
    this.formWhatsapp.set((event.target as HTMLInputElement).value);
  }

  onEmailInput(event: Event): void {
    this.formEmail.set((event.target as HTMLInputElement).value);
  }

  onSubmit(): void {
    this.submitAttempted.set(true);
    this.formSuccess.set(null);

    if (!this.nameValid() || !this.primaryColorValid() || !this.secondaryColorValid()) {
      return;
    }

    const payload: BrandingUpdate = { name: this.formName().trim() };
    const logoUrl = this.formLogoUrl().trim();
    const primaryColor = this.formPrimaryColor().trim();
    const secondaryColor = this.formSecondaryColor().trim();
    const phone = this.formPhone().trim();
    const emergencyPhone = this.formEmergencyPhone().trim();
    const whatsapp = this.formWhatsapp().trim();
    const email = this.formEmail().trim();

    if (logoUrl) payload.logoUrl = logoUrl;
    if (primaryColor) payload.primaryColor = primaryColor;
    if (secondaryColor) payload.secondaryColor = secondaryColor;
    if (phone) payload.phone = phone;
    if (emergencyPhone) payload.emergencyPhone = emergencyPhone;
    if (whatsapp) payload.whatsapp = whatsapp;
    if (email) payload.email = email;

    this.formLoading.set(true);
    this.formError.set(null);

    this.api.save(payload).subscribe({
      next: (saved) => {
        this.formLoading.set(false);
        this.branding.set(saved);
        this.populateForm(saved);
        this.submitAttempted.set(false);
        this.formSuccess.set('Los cambios se guardaron correctamente.');
      },
      error: (err) => {
        this.formLoading.set(false);
        this.formError.set(this.describeWriteError(err, 'Ocurrió un error al guardar la personalización.'));
      },
    });
  }
}
