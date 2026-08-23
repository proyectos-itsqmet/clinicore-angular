import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OperatorApiService } from '../../../core/api/operator-api.service';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import type { Operator, Page, Establishment } from '../../../core/models';

@Component({
  selector: 'app-operator-list',
  imports: [ReactiveFormsModule],
  templateUrl: './operator-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperatorListComponent implements OnInit {
  private readonly api = inject(OperatorApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly data = signal<Page<Operator> | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly isModalOpen = signal<boolean>(false);
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly isAssignModalOpen = signal<boolean>(false);
  protected readonly currentOperatorId = signal<string | null>(null);
  
  protected readonly establishments = signal<Establishment[]>([]);
  protected readonly establishmentsLoading = signal<boolean>(false);

  protected readonly formLoading = signal<boolean>(false);
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    role: ['ROLE_EMPLOYEE', Validators.required]
  });

  protected readonly assignForm = this.fb.nonNullable.group({
    stablishmentId: [0, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    this.loadPage(0);
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    
    this.api.getAll(page, 10).subscribe({
      next: (pageData) => {
        this.data.set(pageData);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los operadores.');
        this.loading.set(false);
      }
    });
  }

  openCreateModal(): void {
    this.currentOperatorId.set(null);
    this.form.reset({ role: 'ROLE_EMPLOYEE' });
    this.form.controls.password.setValidators([Validators.required]);
    this.form.controls.password.updateValueAndValidity();
    this.isModalOpen.set(true);
  }

  openEditModal(operator: Operator): void {
    this.currentOperatorId.set(operator.uuid);
    this.form.patchValue({
      email: operator.email,
      firstName: operator.firstName,
      lastName: operator.lastName,
      role: operator.role
    });
    // La contraseña es opcional al editar
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.formLoading.set(true);
    const payload = this.form.getRawValue();
    if (!payload.password) {
      delete (payload as any).password;
    }
    const id = this.currentOperatorId();

    const request$ = id 
      ? this.api.update(id, payload)
      : this.api.create(payload);

    request$.subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeModal();
        const currentPage = this.data()?.pageable?.pageNumber ?? 0;
        this.loadPage(currentPage);
      },
      error: () => {
        alert('Ocurrió un error al guardar el operador.');
        this.formLoading.set(false);
      }
    });
  }

  openDeleteModal(id: string): void {
    this.currentOperatorId.set(id);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.currentOperatorId.set(null);
  }

  confirmDelete(): void {
    const id = this.currentOperatorId();
    if (!id) return;

    this.formLoading.set(true);
    this.api.delete(id).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeDeleteModal();
        const currentPage = this.data()?.pageable?.pageNumber ?? 0;
        this.loadPage(currentPage);
      },
      error: () => {
        alert('Error al eliminar el operador.');
        this.formLoading.set(false);
        this.closeDeleteModal();
      }
    });
  }

  openAssignModal(id: string): void {
    this.currentOperatorId.set(id);
    this.assignForm.reset({ stablishmentId: 0 });
    this.isAssignModalOpen.set(true);
    
    if (this.establishments().length === 0) {
      this.establishmentsLoading.set(true);
      // Cargar 100 establecimientos para el selector
      this.establishmentApi.getAll(0, 100).subscribe({
        next: (page) => {
          this.establishments.set(page.content);
          this.establishmentsLoading.set(false);
        },
        error: () => {
          this.establishmentsLoading.set(false);
          alert('Error al cargar establecimientos.');
        }
      });
    }
  }

  closeAssignModal(): void {
    this.isAssignModalOpen.set(false);
    this.currentOperatorId.set(null);
  }

  onAssignSubmit(): void {
    if (this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }
    
    const id = this.currentOperatorId();
    if (!id) return;
    
    this.formLoading.set(true);
    this.api.assignToStablishment(id, this.assignForm.getRawValue().stablishmentId).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeAssignModal();
        alert('Establecimiento asignado correctamente.');
        const currentPage = this.data()?.pageable?.pageNumber ?? 0;
        this.loadPage(currentPage);
      },
      error: () => {
        this.formLoading.set(false);
        alert('Error al asignar establecimiento.');
      }
    });
  }
}
