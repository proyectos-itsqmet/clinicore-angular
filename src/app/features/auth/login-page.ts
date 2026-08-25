import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required],
  });

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly registeredSuccess = signal(false);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const email = params.get('email');
      const registered = params.get('registered');

      if (registered === 'true') {
        this.registeredSuccess.set(true);
      }
      if (email) {
        this.form.patchValue({ identifier: email });
      }
    });
  }

  protected onLogin(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const identifier = raw.identifier.trim();
    const isDigitsOnly = /^[0-9]{10}$/.test(identifier);

    const patientPayload = {
      ci: isDigitsOnly ? identifier : undefined,
      email: !isDigitsOnly ? identifier : undefined,
      password: raw.password
    };

    // Intentamos login como paciente primero
    this.authService.loginPatient(patientPayload).pipe(
      catchError((patientErr) => {
        // Si no es paciente, probamos login de doctor
        return this.authService.loginDoctor(patientPayload).pipe(
          catchError((doctorErr) => {
            // Si tampoco es doctor, probamos login de operador/admin
            const operatorPayload = {
              email: identifier,
              password: raw.password
            };
            return this.authService.login(operatorPayload).pipe(
              catchError(() => {
                const msg = patientErr?.error?.message || patientErr?.error?.Message || 'Credenciales incorrectas o usuario no encontrado.';
                this.error.set(msg);
                return of(null);
              })
            );
          })
        );
      })
    ).subscribe((res) => {
      this.loading.set(false);
      if (res) {
        if (res.role === 'ROLE_ADMIN' || res.role === 'ROLE_EMPLOYEE') {
          this.router.navigate(['/admin/dashboard/resumen']);
        } else if (res.role === 'ROLE_DOCTOR') {
          this.router.navigate(['/admin/mis-asignaciones/servicios']);
        } else if (res.role === 'ROLE_OPERATOR') {
          this.router.navigate(['/admin/turnos']); // or whichever is default for operator
        } else {
          // Paciente redirigido al flujo de agendamiento de turnos
          this.router.navigate(['/agendar']);
        }
      }
    });
  }
}
