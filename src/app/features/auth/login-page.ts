import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected onLogin(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.authService.login(this.form.getRawValue()).pipe(
      catchError(() => {
        this.error.set('Credenciales incorrectas o error en el servidor.');
        return of(null);
      })
    ).subscribe((res) => {
      this.loading.set(false);
      if (res) {
        this.router.navigate(['/admin']);
      }
    });
  }
}
