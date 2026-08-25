import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { DoctorApiService } from '../../../core/api/doctor-api.service';
import { ServicioApiService } from '../../../core/api/servicio-api.service';
import { OperatorApiService } from '../../../core/api/operator-api.service';
import { PatientApiService } from '../../../core/api/patient-api.service';
import type { Establishment, AdminDoctor, Servicio, Operator, Patient, Page } from '../../../core/models';

@Component({
  selector: 'app-establishment-detail',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, DecimalPipe],
  templateUrl: './establishment-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstablishmentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly doctorApi = inject(DoctorApiService);
  private readonly servicioApi = inject(ServicioApiService);
  private readonly operatorApi = inject(OperatorApiService);
  private readonly patientApi = inject(PatientApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly establishment = signal<Establishment | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  // Listas asociadas al establecimiento (paginadas: antes se pedía una única
  // página fija de 100 elementos y todo lo que hubiera después simplemente
  // desaparecía sin aviso; ahora cada lista es una `Page<T>` real con
  // búsqueda por nombre y paginación, igual que los modales de asignación).
  protected readonly doctors = signal<Page<AdminDoctor> | null>(null);
  protected readonly doctorsLoading = signal<boolean>(true);
  protected readonly doctorsFilterName = signal<string>('');

  protected readonly services = signal<Page<Servicio> | null>(null);
  protected readonly servicesLoading = signal<boolean>(true);
  protected readonly servicesFilterName = signal<string>('');

  protected readonly operators = signal<Page<Operator> | null>(null);
  protected readonly operatorsLoading = signal<boolean>(true);
  protected readonly operatorsFilterName = signal<string>('');

  // Modales
  protected readonly isEditModalOpen = signal<boolean>(false);
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly isAssignDoctorModalOpen = signal<boolean>(false);
  protected readonly isAssignServiceModalOpen = signal<boolean>(false);
  protected readonly isAssignOperatorModalOpen = signal<boolean>(false);
  protected readonly isAssignPatientModalOpen = signal<boolean>(false);
  protected readonly formLoading = signal<boolean>(false);

  // Búsqueda y Asignación de Doctores al Establecimiento
  protected readonly candidateDoctorName = signal<string>('');
  protected readonly candidateDoctorCi = signal<string>('');
  protected readonly candidateDoctors = signal<Page<AdminDoctor> | null>(null);
  protected readonly candidateDoctorsLoading = signal<boolean>(false);
  protected readonly candidateDoctorsPage = signal<number>(0);
  protected readonly assigningDoctorUuid = signal<string | null>(null);
  protected readonly assignDoctorSuccess = signal<string | null>(null);
  protected readonly assignDoctorError = signal<string | null>(null);

  // Búsqueda y Asignación de Servicios al Establecimiento
  protected readonly candidateServiceName = signal<string>('');
  protected readonly candidateServices = signal<Page<Servicio> | null>(null);
  protected readonly candidateServiceLoading = signal<boolean>(false);
  protected readonly candidateServicePage = signal<number>(0);
  protected readonly assigningServiceId = signal<number | null>(null);
  protected readonly assignServiceSuccess = signal<string | null>(null);
  protected readonly assignServiceError = signal<string | null>(null);

  // Búsqueda y Consulta de Pacientes
  protected readonly candidatePatientName = signal<string>('');
  protected readonly candidatePatientCi = signal<string>('');
  protected readonly candidatePatients = signal<Page<Patient> | null>(null);
  protected readonly candidatePatientLoading = signal<boolean>(false);
  protected readonly candidatePatientPage = signal<number>(0);
  protected readonly assignPatientSuccess = signal<string | null>(null);

  // Formulario de edición
  protected readonly editForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    address: ['', Validators.required]
  });

  private establishmentId: number = 0;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.establishmentId = idParam ? Number(idParam) : 0;

    if (this.establishmentId > 0) {
      this.loadAll();
    } else {
      this.error.set('Identificador de establecimiento no válido');
      this.loading.set(false);
    }
  }

  loadAll(): void {
    this.loadEstablishment();
    this.loadDoctors();
    this.loadServices();
    this.loadOperators();
  }

  loadEstablishment(): void {
    this.loading.set(true);
    this.error.set(null);
    this.establishmentApi.getById(this.establishmentId).subscribe({
      next: (est) => {
        this.establishment.set(est);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la información del establecimiento.');
        this.loading.set(false);
      }
    });
  }

  loadDoctors(page: number = 0): void {
    this.doctorsLoading.set(true);
    const name = this.doctorsFilterName().trim() || undefined;
    this.establishmentApi.getDoctors(this.establishmentId, page, 10, name).subscribe({
      next: (pageData) => {
        this.doctors.set(pageData);
        this.doctorsLoading.set(false);
      },
      error: () => {
        this.doctorsLoading.set(false);
      }
    });
  }

  onDoctorsFilterChange(name: string): void {
    this.doctorsFilterName.set(name);
    this.loadDoctors(0);
  }

  loadServices(page: number = 0): void {
    this.servicesLoading.set(true);
    const name = this.servicesFilterName().trim() || undefined;
    this.establishmentApi.getServices(this.establishmentId, page, 10, name).subscribe({
      next: (pageData) => {
        this.services.set(pageData);
        this.servicesLoading.set(false);
      },
      error: () => {
        this.servicesLoading.set(false);
      }
    });
  }

  onServicesFilterChange(name: string): void {
    this.servicesFilterName.set(name);
    this.loadServices(0);
  }

  loadOperators(page: number = 0): void {
    this.operatorsLoading.set(true);
    const name = this.operatorsFilterName().trim() || undefined;
    this.establishmentApi.getOperators(this.establishmentId, page, 10, name).subscribe({
      next: (pageData) => {
        this.operators.set(pageData);
        this.operatorsLoading.set(false);
      },
      error: () => {
        this.operatorsLoading.set(false);
      }
    });
  }

  onOperatorsFilterChange(name: string): void {
    this.operatorsFilterName.set(name);
    this.loadOperators(0);
  }

  // --- Modal Editar Establecimiento ---
  openEditModal(): void {
    const est = this.establishment();
    if (!est) return;

    this.editForm.patchValue({
      name: est.name,
      address: est.address
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

    this.establishmentApi.update(this.establishmentId, payload).subscribe({
      next: (updatedEst) => {
        this.formLoading.set(false);
        this.closeEditModal();
        this.establishment.set(updatedEst);
        alert('Establecimiento actualizado correctamente.');
      },
      error: () => {
        this.formLoading.set(false);
        alert('Error al actualizar el establecimiento.');
      }
    });
  }

  // --- Modal Eliminar Establecimiento ---
  openDeleteModal(): void {
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
  }

  confirmDelete(): void {
    this.formLoading.set(true);
    this.establishmentApi.delete(this.establishmentId).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeDeleteModal();
        alert('Establecimiento eliminado correctamente.');
        this.router.navigate(['/admin/administracion/establecimientos']);
      },
      error: () => {
        this.formLoading.set(false);
        alert('Error al eliminar el establecimiento.');
        this.closeDeleteModal();
      }
    });
  }

  // --- Modal Asignar Doctor al Establecimiento (Búsqueda por Nombre o CI) ---
  openAssignDoctorModal(): void {
    this.candidateDoctorName.set('');
    this.candidateDoctorCi.set('');
    this.candidateDoctors.set(null);
    this.assignDoctorSuccess.set(null);
    this.assignDoctorError.set(null);
    this.isAssignDoctorModalOpen.set(true);
    this.searchCandidateDoctors(0);
  }

  closeAssignDoctorModal(): void {
    this.isAssignDoctorModalOpen.set(false);
  }

  searchCandidateDoctors(page: number = 0): void {
    this.candidateDoctorsLoading.set(true);
    this.candidateDoctorsPage.set(page);
    this.assignDoctorSuccess.set(null);
    this.assignDoctorError.set(null);

    const name = this.candidateDoctorName().trim() || undefined;
    const ci = this.candidateDoctorCi().trim() || undefined;

    this.doctorApi.getAll(page, 5, name, ci).subscribe({
      next: (data) => {
        this.candidateDoctors.set(data);
        this.candidateDoctorsLoading.set(false);
      },
      error: () => {
        this.candidateDoctorsLoading.set(false);
        this.assignDoctorError.set('Error al consultar doctores.');
      }
    });
  }

  resetCandidateDoctorSearch(): void {
    this.candidateDoctorName.set('');
    this.candidateDoctorCi.set('');
    this.searchCandidateDoctors(0);
  }

  onAssignDoctor(doc: AdminDoctor): void {
    if (!doc.uuid) return;
    this.assigningDoctorUuid.set(doc.uuid);
    this.assignDoctorSuccess.set(null);
    this.assignDoctorError.set(null);

    this.doctorApi.assignToStablishment(doc.uuid, this.establishmentId).subscribe({
      next: () => {
        this.assigningDoctorUuid.set(null);
        this.assignDoctorSuccess.set(`Dr. ${doc.firstName} ${doc.lastName} asignado exitosamente.`);
        this.loadDoctors();
      },
      error: (err) => {
        this.assigningDoctorUuid.set(null);
        const msg = err?.error?.message || err?.error?.Message || 'No se pudo asignar el doctor al establecimiento.';
        this.assignDoctorError.set(msg);
      }
    });
  }

  // --- Modal Asignar Servicio al Establecimiento (Búsqueda por Nombre) ---
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

    this.establishmentApi.assignService(this.establishmentId, srv.id).subscribe({
      next: () => {
        this.assigningServiceId.set(null);
        this.assignServiceSuccess.set(`Servicio "${srv.name}" asignado exitosamente.`);
        this.loadServices();
      },
      error: (err) => {
        this.assigningServiceId.set(null);
        const msg = err?.error?.message || err?.error?.Message || 'No se pudo asignar el servicio al establecimiento.';
        this.assignServiceError.set(msg);
      }
    });
  }

  // --- Modal Asignar / Buscar Pacientes ---
  openAssignPatientModal(): void {
    this.candidatePatientName.set('');
    this.candidatePatientCi.set('');
    this.candidatePatients.set(null);
    this.assignPatientSuccess.set(null);
    this.isAssignPatientModalOpen.set(true);
    this.searchCandidatePatients(0);
  }

  closeAssignPatientModal(): void {
    this.isAssignPatientModalOpen.set(false);
  }

  searchCandidatePatients(page: number = 0): void {
    this.candidatePatientLoading.set(true);
    this.candidatePatientPage.set(page);
    this.assignPatientSuccess.set(null);

    const name = this.candidatePatientName().trim() || undefined;
    const ci = this.candidatePatientCi().trim() || undefined;

    this.patientApi.getAll(name, ci, page, 5).subscribe({
      next: (data) => {
        this.candidatePatients.set(data);
        this.candidatePatientLoading.set(false);
      },
      error: () => {
        this.candidatePatientLoading.set(false);
      }
    });
  }

  resetCandidatePatientSearch(): void {
    this.candidatePatientName.set('');
    this.candidatePatientCi.set('');
    this.searchCandidatePatients(0);
  }
}
