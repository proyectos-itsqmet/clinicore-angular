import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { Button } from '../../shared/ui/atoms/button/button';
import { InlineAlert } from '../../shared/ui/molecules/inline-alert/inline-alert';
import { InputField } from '../../shared/ui/molecules/input-field/input-field';

/**
 * app-login-page — the panel's front door.
 *
 * IT IS THE ONLY SCREEN IN THE APP WITH THE LANDING'S FIELD BACKGROUND AND
 * NOTHING ELSE ON IT, and that is deliberate: it is the one page that belongs to
 * neither the landing's chrome nor the panel's shell. It borrows the design
 * system's card, its type scale and its own `app-button` so it still reads as the
 * same product, without inventing a third set of surfaces.
 *
 * THE "REMEMBER ME" CHECKBOX AND THE PASSWORD-RECOVERY LINK ARE GONE. Both were
 * furniture: the checkbox was bound to nothing and would have changed no
 * behaviour if ticked, and the link pointed at `href="#"`. `admin-layout.ts`
 * already states the rule this follows — the panel ships marked placeholders, not
 * controls that lie about what they do. Session lifetime is a cookie the backend
 * sets; when there is a real recovery endpoint, the link comes back pointing at
 * it.
 *
 * The failure copy stays vague on PURPOSE. "Correo o contraseña incorrectos"
 * covers both, so a wrong password and an unknown account are indistinguishable
 * from outside — telling them apart is how an attacker enumerates who has an
 * account here.
 */
@Component({
  selector: 'app-login-page',
  imports: [Button, InlineAlert, InputField, ReactiveFormsModule],
  templateUrl: './login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class LoginPage {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly messages = {
    email: { required: 'El correo es obligatorio.' },
    password: { required: 'La contraseña es obligatoria.' },
  } as const;

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.pending.set(true);
    this.error.set(null);

    this.auth
      .login(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pending.set(false);
          void this.router.navigate(['/admin']);
        },
        error: () => {
          this.pending.set(false);
          this.error.set('Correo o contraseña incorrectos.');
        },
      });
  }
}
