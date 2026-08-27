import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { SelectField, type SelectOption } from '../../shared/ui/molecules/select-field/select-field';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, LoginResponse } from '../../core/auth/auth.service';
import { TurnApiService } from '../../core/api/turn-api.service';
import { PatientApiService } from '../../core/api/patient-api.service';
import type { Page, Turn, TurnFilterParams, TurnStatus } from '../../core/models';

@Component({
  selector: 'app-patient-profile',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, SelectField],
  templateUrl: './patient-profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientProfileComponent implements OnInit {
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);
  private readonly turnApi = inject(TurnApiService);
  private readonly fb = inject(FormBuilder);

  // Datos del perfil
  protected readonly isEditingProfile = signal<boolean>(false);
  protected readonly profileSaveSuccess = signal<boolean>(false);

  // Información editable del paciente
  protected readonly userProfile = signal({
    firstName: '',
    lastName: '',
    email: '',
    ci: '',
    birthday: '',
    gender: 'GENDER_MALE',
    phone: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });

  // Formulario de edición de perfil
  protected readonly editProfileForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    birthday: [''],
    gender: ['GENDER_MALE'],
    phone: [''],
    address: [''],
    emergencyContactName: [''],
    emergencyContactPhone: ['']
  });

  // Turnos del paciente
  protected readonly myTurns = signal<Page<Turn> | null>(null);
  protected readonly turnsLoading = signal<boolean>(false);
  protected readonly turnsError = signal<string | null>(null);
  protected readonly actionSuccessMessage = signal<string | null>(null);
  protected readonly actionErrorMessage = signal<string | null>(null);

  // Modal Cancelar Turno
  protected readonly isCancelModalOpen = signal<boolean>(false);
  protected readonly turnToCancel = signal<Turn | null>(null);
  protected readonly cancellingTurn = signal<boolean>(false);

  // Filtros de turnos
  protected readonly filterStatus = signal<string>('');
  protected readonly filterFrom = signal<string>('');
  protected readonly filterTo = signal<string>('');
  protected readonly currentPage = signal<number>(0);

  ngOnInit(): void {
    // 1. Cargar usuario inicial inmediatamente de la memoria/localStorage
    const cachedUser = this.authService.currentUser();
    if (cachedUser) {
      this.populateUserData(cachedUser);
      this.loadMyTurns(0);
    }

    // 2. Refrescar / validar sesión con backend
    this.authService.checkSession().subscribe({
      next: (isAuthenticated) => {
        const user = this.authService.currentUser();
        if (user) {
          this.populateUserData(user);
          if (!cachedUser) {
            this.loadMyTurns(0);
          }
        } else if (!isAuthenticated && !cachedUser) {
          this.router.navigate(['/login']);
        }
      },
      error: () => {
        if (!cachedUser && !this.authService.isAuthenticated()) {
          this.router.navigate(['/login']);
        }
      }
    });

    if (!cachedUser) {
      this.loadMyTurns(0);
    }
  }

  private populateUserData(user: LoginResponse): void {
    this.userProfile.set({
      firstName: user.firstName || 'Paciente',
      lastName: user.lastName || '',
      email: user.email || '',
      ci: '',
      birthday: '',
      gender: 'GENDER_MALE',
      phone: '',
      address: '',
      emergencyContactName: '',
      emergencyContactPhone: ''
    });

    this.editProfileForm.patchValue({
      firstName: user.firstName || '',
      lastName: user.lastName || ''
    });
  }

  loadMyTurns(page: number = 0): void {
    this.turnsLoading.set(true);
    this.turnsError.set(null);
    this.currentPage.set(page);

    const filterParams: TurnFilterParams = {
      page,
      size: 6,
      status: this.filterStatus() as TurnStatus || undefined,
      from: this.filterFrom() || undefined,
      to: this.filterTo() || undefined,
      sort: 'schedule.date,desc'
    };

    this.turnApi.getMyTurns(filterParams).subscribe({
      next: (data) => {
        this.myTurns.set(data);
        this.turnsLoading.set(false);
      },
      error: (err) => {
        this.turnsLoading.set(false);
        if (err.status === 401 || err.status === 403) {
          this.turnsError.set('No se pudieron consultar los turnos (sesión no válida).');
        } else {
          this.turnsError.set('No se pudieron cargar los turnos.');
        }
      }
    });
  }

  // --- Cancelación de Turno por el Paciente (PUT /api/turns/{id}/cancelled) ---

  openCancelModal(turn: Turn): void {
    this.turnToCancel.set(turn);
    this.isCancelModalOpen.set(true);
  }

  closeCancelModal(): void {
    this.isCancelModalOpen.set(false);
    this.turnToCancel.set(null);
  }

  confirmCancelTurn(): void {
    const turn = this.turnToCancel();
    if (!turn) return;

    this.cancellingTurn.set(true);
    this.actionErrorMessage.set(null);

    this.turnApi.cancelMyTurn(turn.id).subscribe({
      next: () => {
        this.cancellingTurn.set(false);
        this.closeCancelModal();
        this.actionSuccessMessage.set(`Tu turno #${turn.id} ha sido cancelado con éxito.`);
        this.loadMyTurns(this.currentPage());

        setTimeout(() => {
          this.actionSuccessMessage.set(null);
        }, 5000);
      },
      error: (err) => {
        this.cancellingTurn.set(false);
        const msg = err?.error?.error || err?.error?.message || 'Ocurrió un error al cancelar tu turno.';
        this.actionErrorMessage.set(msg);
        this.closeCancelModal();
      }
    });
  }

  // --- Filtros de Turnos ---
  protected readonly GENDER_OPTIONS: readonly SelectOption[] = [
    { value: 'GENDER_MALE', label: 'Masculino' },
    { value: 'GENDER_FEMALE', label: 'Femenino' },
    { value: 'GENDER_OTHER', label: 'Otro' },
  ];

  protected readonly TURN_STATUS_FILTER_OPTIONS: readonly SelectOption[] = [
    { value: '', label: 'Todos los Estados' },
    { value: 'TURN_PENDING', label: 'Pendiente' },
    { value: 'TURN_TREATED', label: 'Atendido' },
    { value: 'TURN_CANCELLED', label: 'Cancelado' },
  ];

  onStatusChange(status: string): void {
    this.filterStatus.set(status);
    this.loadMyTurns(0);
  }

  onFromChange(from: string): void {
    this.filterFrom.set(from);
    this.loadMyTurns(0);
  }

  onToChange(to: string): void {
    this.filterTo.set(to);
    this.loadMyTurns(0);
  }

  resetTurnFilters(): void {
    this.filterStatus.set('');
    this.filterFrom.set('');
    this.filterTo.set('');
    this.loadMyTurns(0);
  }

  // --- Edición de Perfil ---
  startEditingProfile(): void {
    const prof = this.userProfile();
    this.editProfileForm.patchValue({
      firstName: prof.firstName,
      lastName: prof.lastName,
      birthday: prof.birthday,
      gender: prof.gender,
      phone: prof.phone,
      address: prof.address,
      emergencyContactName: prof.emergencyContactName,
      emergencyContactPhone: prof.emergencyContactPhone
    });
    this.isEditingProfile.set(true);
    this.profileSaveSuccess.set(false);
  }

  cancelEditingProfile(): void {
    this.isEditingProfile.set(false);
  }

  private readonly patientApi = inject(PatientApiService);

  onSaveProfile(): void {
    if (this.editProfileForm.invalid) {
      this.editProfileForm.markAllAsTouched();
      return;
    }

    const formVal = this.editProfileForm.getRawValue();
    const current = this.userProfile();

    this.patientApi.updateMyProfile(formVal).subscribe({
      next: (updated) => {
        this.userProfile.set({
          ...current,
          ...updated
        });
        this.isEditingProfile.set(false);
        this.profileSaveSuccess.set(true);

        setTimeout(() => {
          this.profileSaveSuccess.set(false);
        }, 4000);
      },
      error: () => {
        // Fallback in case of error (for simplicity, usually you'd show an error message)
      }
    });
  }

  // --- Cerrar Sesión ---
  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // --- Cambio de Contraseña ---
  protected readonly isChangingPassword = signal<boolean>(false);
  protected readonly passwordChangeSuccess = signal<boolean>(false);
  protected readonly passwordChangeError = signal<string | null>(null);

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

    this.passwordChangeError.set(null);
    this.patientApi.changeMyPassword({ password, repeatedPassword }).subscribe({
      next: () => {
        this.isChangingPassword.set(false);
        this.passwordChangeSuccess.set(true);
        setTimeout(() => {
          this.passwordChangeSuccess.set(false);
        }, 4000);
      },
      error: (err) => {
        this.passwordChangeError.set(err?.error?.error || err?.error?.message || 'Error al cambiar la contraseña.');
      }
    });
  }
}
