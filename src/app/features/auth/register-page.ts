import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, PatientRegistrationRequest } from '../../core/auth/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  // Formulario principal de Registro
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    ci: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    birthday: ['', Validators.required],
    // Opcionales
    address: [''],
    emergencyContactName: [''],
    emergencyContactPhone: [''],
    phone: [''],
    gender: ['GENDER_MALE']
  });

  // Formulario de OTP
  protected readonly otpForm = this.fb.nonNullable.group({
    otp: ['', [Validators.required, Validators.minLength(4)]]
  });

  // Estados
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isOtpModalOpen = signal(false);
  protected readonly otpLoading = signal(false);
  protected readonly otpError = signal<string | null>(null);
  protected readonly registrationSuccess = signal(false);

  // Paso 1: Iniciar registro con Email y CI
  protected onInitRegistration(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { email, ci } = this.form.getRawValue();

    this.authService.initRegistrationPatient({ email: email.trim(), ci: ci.trim() }).subscribe({
      next: () => {
        this.loading.set(false);
        this.otpForm.reset({ otp: '' });
        this.otpError.set(null);
        this.isOtpModalOpen.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || err?.error?.error || err?.error?.Message || 'Error al iniciar el registro. Verifica que el correo o cédula no estén ya registrados.';
        this.error.set(msg);
      }
    });
  }

  // Paso 2 y 3: Verificar OTP y Completar Registro
  protected onVerifyOtpAndRegister(): void {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    this.otpLoading.set(true);
    this.otpError.set(null);

    const otpVal = this.otpForm.getRawValue().otp.trim();

    this.authService.verifyRegistrationOtp({ otp: otpVal }).subscribe({
      next: () => {
        // OTP verificado con éxito, procedemos a registrar con los datos completos
        this.completePatientRegistration();
      },
      error: (err) => {
        this.otpLoading.set(false);
        const msg = err?.error?.message || err?.error?.error || err?.error?.Message || 'Código OTP incorrecto o expirado. Por favor, revísalo e intenta de nuevo.';
        this.otpError.set(msg);
      }
    });
  }

  private completePatientRegistration(): void {
    const raw = this.form.getRawValue();
    const payload: PatientRegistrationRequest = {
      email: raw.email.trim(),
      password: raw.password,
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      ci: raw.ci.trim(),
      birthday: raw.birthday,
      address: raw.address?.trim() || undefined,
      emergencyContactName: raw.emergencyContactName?.trim() || undefined,
      emergencyContactPhone: raw.emergencyContactPhone?.trim() || undefined,
      phone: raw.phone?.trim() || undefined,
      gender: raw.gender || undefined
    };

    this.authService.registerPatient(payload).subscribe({
      next: () => {
        this.otpLoading.set(false);
        this.isOtpModalOpen.set(false);
        this.registrationSuccess.set(true);

        // Redirección amigable a login tras un breve momento
        setTimeout(() => {
          this.router.navigate(['/login'], {
            queryParams: { email: payload.email, registered: 'true' }
          });
        }, 2200);
      },
      error: (err) => {
        this.otpLoading.set(false);
        const msg = err?.error?.message || err?.error?.error || err?.error?.Message || 'Error al completar el registro del paciente.';
        this.otpError.set(msg);
      }
    });
  }

  // Reenviar OTP
  protected resendOtp(): void {
    const { email, ci } = this.form.getRawValue();
    this.otpLoading.set(true);
    this.otpError.set(null);

    this.authService.initRegistrationPatient({ email: email.trim(), ci: ci.trim() }).subscribe({
      next: () => {
        this.otpLoading.set(false);
        alert('Se ha reenviado un nuevo código OTP a tu correo.');
      },
      error: () => {
        this.otpLoading.set(false);
        this.otpError.set('No se pudo reenviar el código OTP. Intenta más tarde.');
      }
    });
  }

  protected closeOtpModal(): void {
    this.isOtpModalOpen.set(false);
  }
}
