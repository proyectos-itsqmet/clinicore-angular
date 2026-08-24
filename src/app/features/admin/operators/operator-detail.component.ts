import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OperatorApiService } from '../../../core/api/operator-api.service';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import type { Operator, Establishment } from '../../../core/models';

@Component({
  selector: 'app-operator-detail',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './operator-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperatorDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly operatorApi = inject(OperatorApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly operator = signal<Operator | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  // Modales
  protected readonly isEditModalOpen = signal<boolean>(false);
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly isAssignEstModalOpen = signal<boolean>(false);
  protected readonly formLoading = signal<boolean>(false);

  // Catálogos para asignación
  protected readonly establishments = signal<Establishment[]>([]);
  protected readonly establishmentsLoading = signal<boolean>(false);

  // Formularios
  protected readonly editForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    role: ['ROLE_EMPLOYEE', Validators.required]
  });

  protected readonly assignEstForm = this.fb.nonNullable.group({
    stablishmentId: [0, [Validators.required, Validators.min(1)]]
  });

  private operatorId: string = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.operatorId = params.get('id') || this.route.snapshot.paramMap.get('id') || '';
      if (this.operatorId) {
        this.loadOperator();
      } else {
        this.error.set('Identificador de operador no válido');
        this.loading.set(false);
      }
    });
  }

  loadOperator(): void {
    this.loading.set(true);
    this.error.set(null);
    this.operatorApi.getById(this.operatorId).subscribe({
      next: (op) => {
        this.operator.set(op);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la información del operador.');
        this.loading.set(false);
      }
    });
  }

  // --- Modal Editar Operador ---
  openEditModal(): void {
    const op = this.operator();
    if (!op) return;

    this.editForm.patchValue({
      email: op.email,
      password: '',
      firstName: op.firstName,
      lastName: op.lastName,
      role: op.role
    });
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
  }

  onEditSubmit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.formLoading.set(true);
    const payload = this.editForm.getRawValue();
    if (!payload.password) {
      delete (payload as any).password;
    }

    this.operatorApi.update(this.operatorId, payload).subscribe({
      next: (updatedOp) => {
        this.formLoading.set(false);
        this.closeEditModal();
        this.operator.set(updatedOp);
        alert('Información del operador actualizada correctamente.');
        this.loadOperator();
      },
      error: () => {
        this.formLoading.set(false);
        alert('Error al actualizar la información del operador.');
      }
    });
  }

  // --- Modal Eliminar Operador ---
  openDeleteModal(): void {
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
  }

  confirmDelete(): void {
    this.formLoading.set(true);
    this.operatorApi.delete(this.operatorId).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeDeleteModal();
        alert('Operador eliminado correctamente.');
        this.router.navigate(['/admin/administracion/operadores']);
      },
      error: () => {
        this.formLoading.set(false);
        alert('Error al eliminar el operador.');
        this.closeDeleteModal();
      }
    });
  }

  // --- Modal Asignar Establecimiento ---
  openAssignEstModal(): void {
    this.assignEstForm.reset({ stablishmentId: 0 });
    this.isAssignEstModalOpen.set(true);

    if (this.establishments().length === 0) {
      this.establishmentsLoading.set(true);
      this.establishmentApi.getAll(0, 100).subscribe({
        next: (page) => {
          this.establishments.set(page.content);
          this.establishmentsLoading.set(false);
        },
        error: () => {
          this.establishmentsLoading.set(false);
          alert('Error al cargar la lista de establecimientos.');
        }
      });
    }
  }

  closeAssignEstModal(): void {
    this.isAssignEstModalOpen.set(false);
  }

  onAssignEstSubmit(): void {
    if (this.assignEstForm.invalid) {
      this.assignEstForm.markAllAsTouched();
      return;
    }

    this.formLoading.set(true);
    const estId = Number(this.assignEstForm.getRawValue().stablishmentId);

    this.operatorApi.assignToStablishment(this.operatorId, estId).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeAssignEstModal();
        alert('Establecimiento asignado correctamente al operador.');
        this.loadOperator();
      },
      error: () => {
        this.formLoading.set(false);
        alert('Error al asignar el establecimiento al operador.');
      }
    });
  }
}
