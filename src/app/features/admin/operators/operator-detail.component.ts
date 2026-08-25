import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { OperatorApiService } from '../../../core/api/operator-api.service';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import type { Operator, Establishment, Page } from '../../../core/models';

@Component({
  selector: 'app-operator-detail',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
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

  // Búsqueda y Asignación de Establecimientos
  protected readonly candidateEstName = signal<string>('');
  protected readonly candidateEstablishments = signal<Page<Establishment> | null>(null);
  protected readonly candidateEstLoading = signal<boolean>(false);
  protected readonly candidateEstPage = signal<number>(0);
  protected readonly assigningEstId = signal<number | null>(null);
  protected readonly assignEstSuccess = signal<string | null>(null);
  protected readonly assignEstError = signal<string | null>(null);

  // Formularios
  protected readonly editForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    role: ['ROLE_EMPLOYEE', Validators.required]
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

  // --- Modal Asignar Establecimiento (Búsqueda) ---
  openAssignEstModal(): void {
    this.candidateEstName.set('');
    this.candidateEstablishments.set(null);
    this.assignEstSuccess.set(null);
    this.assignEstError.set(null);
    this.isAssignEstModalOpen.set(true);
    this.searchCandidateEst(0);
  }

  closeAssignEstModal(): void {
    this.isAssignEstModalOpen.set(false);
  }

  searchCandidateEst(page: number = 0): void {
    this.candidateEstLoading.set(true);
    this.candidateEstPage.set(page);
    this.assignEstSuccess.set(null);
    this.assignEstError.set(null);

    const name = this.candidateEstName().trim() || undefined;

    this.establishmentApi.getAll(page, 5, name).subscribe({
      next: (data) => {
        this.candidateEstablishments.set(data);
        this.candidateEstLoading.set(false);
      },
      error: () => {
        this.candidateEstLoading.set(false);
        this.assignEstError.set('Error al consultar establecimientos.');
      }
    });
  }

  resetCandidateEstSearch(): void {
    this.candidateEstName.set('');
    this.searchCandidateEst(0);
  }

  onAssignEst(est: Establishment): void {
    if (!est.id) return;
    this.assigningEstId.set(est.id);
    this.assignEstSuccess.set(null);
    this.assignEstError.set(null);

    this.operatorApi.assignToStablishment(this.operatorId, est.id).subscribe({
      next: () => {
        this.assigningEstId.set(null);
        this.assignEstSuccess.set(`Sede "${est.name}" asignada correctamente.`);
        this.loadOperator();
      },
      error: (err) => {
        this.assigningEstId.set(null);
        const msg = err?.error?.message || err?.error?.Message || 'No se pudo asignar el establecimiento al operador.';
        this.assignEstError.set(msg);
      }
    });
  }

  onRevokeEst(est: Establishment): void {
    if (!est.id) return;
    if (!confirm(`¿Estás seguro de desasignar la sede "${est.name}" de este operador?`)) return;

    this.operatorApi.revokeStablishment(this.operatorId, est.id).subscribe({
      next: () => {
        alert('Sede desasignada exitosamente.');
        this.loadOperator();
      },
      error: () => {
        alert('Error al desasignar la sede.');
      }
    });
  }
}
