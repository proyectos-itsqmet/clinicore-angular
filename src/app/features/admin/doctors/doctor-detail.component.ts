import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DoctorApiService } from '../../../core/api/doctor-api.service';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { ServicioApiService } from '../../../core/api/servicio-api.service';
import type { AdminDoctor, Establishment, Servicio, Page } from '../../../core/models';

@Component({
  selector: 'app-doctor-detail',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, DecimalPipe],
  templateUrl: './doctor-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly doctorApi = inject(DoctorApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly servicioApi = inject(ServicioApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly doctor = signal<AdminDoctor | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  // Modales
  protected readonly isEditModalOpen = signal<boolean>(false);
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly isAssignEstModalOpen = signal<boolean>(false);
  protected readonly isAssignServiceModalOpen = signal<boolean>(false);
  protected readonly formLoading = signal<boolean>(false);

  // Búsqueda y Asignación de Establecimientos al Doctor
  protected readonly candidateEstName = signal<string>('');
  protected readonly candidateEstablishments = signal<Page<Establishment> | null>(null);
  protected readonly candidateEstLoading = signal<boolean>(false);
  protected readonly candidateEstPage = signal<number>(0);
  protected readonly assigningEstId = signal<number | null>(null);
  protected readonly assignEstSuccess = signal<string | null>(null);
  protected readonly assignEstError = signal<string | null>(null);

  // Búsqueda y Asignación de Servicios al Doctor
  protected readonly candidateServiceName = signal<string>('');
  protected readonly candidateServices = signal<Page<Servicio> | null>(null);
  protected readonly candidateServiceLoading = signal<boolean>(false);
  protected readonly candidateServicePage = signal<number>(0);
  protected readonly assigningServiceId = signal<number | null>(null);
  protected readonly assignServiceSuccess = signal<string | null>(null);
  protected readonly assignServiceError = signal<string | null>(null);

  // Formularios
  protected readonly editForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    speciality: ['', Validators.required],
    gender: ['GENDER_MALE', Validators.required],
    ci: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]]
  });

  private doctorId: string = '';

  ngOnInit(): void {
    this.doctorId = this.route.snapshot.paramMap.get('id') || '';
    if (this.doctorId) {
      this.loadDoctor();
    } else {
      this.error.set('Identificador de doctor no válido');
      this.loading.set(false);
    }
  }

  loadDoctor(): void {
    this.loading.set(true);
    this.error.set(null);
    this.doctorApi.getById(this.doctorId).subscribe({
      next: (doc) => {
        this.doctor.set(doc);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la información del doctor.');
        this.loading.set(false);
      }
    });
  }

  // --- Modal Editar ---
  openEditModal(): void {
    const doc = this.doctor();
    if (!doc) return;

    this.editForm.patchValue({
      email: doc.email,
      firstName: doc.firstName,
      lastName: doc.lastName,
      speciality: doc.speciality,
      gender: doc.gender,
      ci: doc.ci
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

    this.doctorApi.update(this.doctorId, payload).subscribe({
      next: (updatedDoc) => {
        this.formLoading.set(false);
        this.closeEditModal();
        this.doctor.set(updatedDoc);
        alert('Información del doctor actualizada correctamente.');
      },
      error: () => {
        this.formLoading.set(false);
        alert('Error al actualizar la información del doctor.');
      }
    });
  }

  // --- Modal Eliminar Doctor ---
  openDeleteModal(): void {
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
  }

  confirmDelete(): void {
    this.formLoading.set(true);
    this.doctorApi.delete(this.doctorId).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeDeleteModal();
        alert('Doctor eliminado correctamente.');
        this.router.navigate(['/admin/administracion/doctores']);
      },
      error: (err) => {
        this.formLoading.set(false);
        // El backend ahora rechaza el borrado con un motivo claro (p. ej. turnos
        // reservados asociados) — mostrar ESE mensaje, no uno genérico, es el
        // punto de esta tarea.
        const msg = err?.error?.message || err?.error?.error || 'Error al eliminar el doctor.';
        alert(msg);
        this.closeDeleteModal();
      }
    });
  }

  // --- Modal Asignar Establecimiento al Doctor ---
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

    this.doctorApi.assignToStablishment(this.doctorId, est.id).subscribe({
      next: () => {
        this.assigningEstId.set(null);
        this.assignEstSuccess.set(`Sede "${est.name}" asignada correctamente.`);
        this.loadDoctor();
      },
      error: (err) => {
        this.assigningEstId.set(null);
        const msg = err?.error?.message || err?.error?.Message || 'No se pudo asignar el establecimiento.';
        this.assignEstError.set(msg);
      }
    });
  }

  // --- Modal Asignar Servicio al Doctor ---
  openAssignServiceModal(): void {
    this.candidateServiceName.set('');
    this.candidateServices.set(null);
    this.assignServiceSuccess.set(null);
    this.assignServiceError.set(null);
    this.isAssignServiceModalOpen.set(true);
    this.searchCandidateServices(0);
  }

  closeAssignServiceModal(): void {
    this.isAssignServiceModalOpen.set(false);
  }

  searchCandidateServices(page: number = 0): void {
    this.candidateServiceLoading.set(true);
    this.candidateServicePage.set(page);
    this.assignServiceSuccess.set(null);
    this.assignServiceError.set(null);

    const name = this.candidateServiceName().trim() || undefined;

    this.servicioApi.getAll(page, 5, name).subscribe({
      next: (data) => {
        this.candidateServices.set(data);
        this.candidateServiceLoading.set(false);
      },
      error: () => {
        this.candidateServiceLoading.set(false);
        this.assignServiceError.set('Error al consultar servicios.');
      }
    });
  }

  resetCandidateServiceSearch(): void {
    this.candidateServiceName.set('');
    this.searchCandidateServices(0);
  }

  onAssignService(srv: Servicio): void {
    if (!srv.id) return;
    this.assigningServiceId.set(srv.id);
    this.assignServiceSuccess.set(null);
    this.assignServiceError.set(null);

    this.doctorApi.assignToService(this.doctorId, srv.id).subscribe({
      next: () => {
        this.assigningServiceId.set(null);
        this.assignServiceSuccess.set(`Servicio "${srv.name}" asignado correctamente.`);
        this.loadDoctor();
      },
      error: (err) => {
        this.assigningServiceId.set(null);
        const msg = err?.error?.message || err?.error?.Message || 'No se pudo asignar el servicio al doctor.';
        this.assignServiceError.set(msg);
      }
    });
  }
}
