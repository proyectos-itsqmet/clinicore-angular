import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';

/**
 * Las dos puertas del sistema.
 *
 * `personal` cubre doctores y operadores/admin: son perfiles distintos para
 * el backend, pero desde la pantalla comparten audiencia, tema y — sobre
 * todo — nivel de confianza, que es lo que decide a dónde puede viajar una
 * contraseña.
 */
export type LoginProfile = 'paciente' | 'personal';

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

  /**
   * Qué puerta está usando quien ingresa. Decide TRES cosas a la vez: el tema
   * de la pantalla, el texto, y — lo que importa — a qué endpoint se manda la
   * contraseña. Ver [staffLogin].
   *
   * Arranca en `paciente` porque es el volumen: el personal son decenas de
   * cuentas y entran a diario sabiendo dónde tocar; los pacientes son miles y
   * muchos entran por primera vez.
   */
  protected readonly profile = signal<LoginProfile>('paciente');

  protected readonly isStaff = computed(() => this.profile() === 'personal');

  /**
   * El personal no se identifica con cédula: sus cuentas son corporativas y
   * el endpoint de operador sólo acepta `email`.
   */
  protected readonly identifierLabel = computed(() =>
    this.isStaff() ? 'Correo corporativo' : 'Correo electrónico o cédula (CI)',
  );

  protected readonly identifierPlaceholder = computed(() =>
    this.isStaff() ? 'nombre@clinicore.com' : 'ejemplo@correo.com o 1724037890',
  );

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

  /** Cambia de pestaña: limpia el error del perfil anterior, que ya no aplica. */
  protected selectProfile(profile: LoginProfile): void {
    if (this.profile() === profile) {
      return;
    }
    this.profile.set(profile);
    this.error.set(null);
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

    const request$ =
      this.profile() === 'paciente'
        ? this.patientLogin(identifier, raw.password)
        : this.staffLogin(identifier, raw.password);

    request$.subscribe((res) => {
      this.loading.set(false);
      if (res) {
        if (res.role === 'ROLE_ADMIN' || res.role === 'ROLE_EMPLOYEE') {
          this.router.navigate(['/admin/dashboard/resumen']);
        } else if (res.role === 'ROLE_DOCTOR') {
          this.router.navigate(['/admin/mis-asignaciones/servicios']);
        } else if (res.role === 'ROLE_OPERATOR') {
          this.router.navigate(['/admin/turnos']);
        } else {
          // Paciente redirigido al flujo de agendamiento de turnos
          this.router.navigate(['/agendar']);
        }
      }
    });
  }

  /**
   * Perfil PACIENTE: un solo endpoint.
   *
   * El identificador puede ser cédula (10 dígitos) o correo, y se manda en el
   * campo que corresponda — el backend distingue por campo, no por formato.
   */
  private patientLogin(identifier: string, password: string) {
    const isDigitsOnly = /^[0-9]{10}$/.test(identifier);

    return this.authService
      .loginPatient({
        ci: isDigitsOnly ? identifier : undefined,
        email: isDigitsOnly ? undefined : identifier,
        password,
      })
      .pipe(catchError((err) => this.reportAndStop(err)));
  }

  /**
   * Perfil PERSONAL: doctor primero, operador/admin después.
   *
   * Siguen siendo dos intentos y no uno porque el backend expone un login por
   * tipo de cuenta y no hay un endpoint único de personal. La diferencia con
   * lo que había antes no es la cantidad de intentos, es CUÁLES:
   *
   * El formulario probaba paciente → doctor → operador SIEMPRE, así que la
   * contraseña de un administrador se enviaba al endpoint de pacientes antes
   * de llegar al suyo. Dos superficies de menor confianza recibían, en texto
   * plano dentro del cuerpo, credenciales administrativas que nunca les
   * correspondían — y quedaban en sus logs de intentos fallidos. Ahora cada
   * contraseña sólo viaja a endpoints de su propio nivel de confianza.
   *
   * El mensaje de error también sale del ÚLTIMO intento del perfil elegido.
   * Antes se mostraba siempre el del endpoint de pacientes, así que un admin
   * con la clave mal tipeada leía un mensaje escrito para otra audiencia.
   */
  private staffLogin(identifier: string, password: string) {
    const payload = { email: identifier, password };

    return this.authService.loginDoctor(payload).pipe(
      catchError(() =>
        this.authService
          .login(payload)
          .pipe(catchError((operatorErr) => this.reportAndStop(operatorErr))),
      ),
    );
  }

  /** Publica el mensaje del servidor y corta el flujo sin propagar el error. */
  private reportAndStop(err: unknown) {
    const body = (err as { error?: { message?: string; Message?: string } })?.error;
    this.error.set(
      body?.message ?? body?.Message ?? 'Credenciales incorrectas o usuario no encontrado.',
    );
    return of(null);
  }
}
