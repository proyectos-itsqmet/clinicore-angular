import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { DoctorApiService } from '../../../core/api/doctor-api.service';
import { OperatorApiService } from '../../../core/api/operator-api.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProfileComponent {
  protected readonly authService = inject(AuthService);
  private readonly doctorApi = inject(DoctorApiService);
  private readonly operatorApi = inject(OperatorApiService);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly isChangingPassword = signal<boolean>(false);
  protected readonly passwordChangeSuccess = signal<boolean>(false);
  protected readonly passwordChangeError = signal<string | null>(null);

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  protected readonly changePasswordForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    repeatedPassword: ['', Validators.required]
  });

  startChangingPassword(): void {
    this.isChangingPassword.set(true);
    this.passwordChangeSuccess.set(false);
    this.passwordChangeError.set(null);
    this.changePasswordForm.reset();
  }

  cancelChangingPassword(): void {
    this.isChangingPassword.set(false);
    this.changePasswordForm.reset();
  }

  onChangePassword(): void {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const { password, repeatedPassword } = this.changePasswordForm.getRawValue();
    if (password !== repeatedPassword) {
      this.passwordChangeError.set('Las contraseñas no coinciden.');
      return;
    }

    const user = this.authService.currentUser();
    if (!user) return;

    this.passwordChangeError.set(null);

    let apiCall = null;
    if (user.role === 'ROLE_DOCTOR') {
      apiCall = this.doctorApi.changeMyPassword({ password, repeatedPassword });
    } else if (user.role === 'ROLE_EMPLOYEE') {
      apiCall = this.operatorApi.changeMyPassword({ password, repeatedPassword });
    } else {
      // ROLE_ADMIN
      apiCall = this.http.put('http://localhost:8080/api/admins/change-password', { password, repeatedPassword }, { withCredentials: true });
    }

    apiCall.subscribe({
      next: () => {
        this.isChangingPassword.set(false);
        this.passwordChangeSuccess.set(true);
        setTimeout(() => {
          this.passwordChangeSuccess.set(false);
        }, 4000);
      },
      error: (err: any) => {
        this.passwordChangeError.set(err?.error?.error || err?.error?.message || 'Error al cambiar la contraseña.');
      }
    });
  }
}
