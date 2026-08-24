import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { DoctorApiService } from '../../../core/api/doctor-api.service';
import { ServicioApiService } from '../../../core/api/servicio-api.service';
import { OperatorApiService } from '../../../core/api/operator-api.service';
import type { Establishment, AdminDoctor, Servicio, Operator } from '../../../core/models';

@Component({
  selector: 'app-establishment-detail',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DecimalPipe],
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
  private readonly fb = inject(FormBuilder);

  protected readonly establishment = signal<Establishment | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  // Listas asociadas al establecimiento
  protected readonly doctors = signal<AdminDoctor[]>([]);
  protected readonly doctorsLoading = signal<boolean>(true);

  protected readonly services = signal<Servicio[]>([]);
  protected readonly servicesLoading = signal<boolean>(true);

  protected readonly operators = signal<Operator[]>([]);
  protected readonly operatorsLoading = signal<boolean>(true);

  // Modales
  protected readonly isEditModalOpen = signal<boolean>(false);
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly isAssignDoctorModalOpen = signal<boolean>(false);
  protected readonly isAssignServiceModalOpen = signal<boolean>(false);
  protected readonly isAssignOperatorModalOpen = signal<boolean>(false);
  protected readonly formLoading = signal<boolean>(false);

  // Catálogos para asignación
  protected readonly availableDoctors = signal<AdminDoctor[]>([]);
  protected readonly availableDoctorsLoading = signal<boolean>(false);

  protected readonly availableServices = signal<Servicio[]>([]);
  protected readonly availableServicesLoading = signal<boolean>(false);

  protected readonly availableOperators = signal<Operator[]>([]);
  protected readonly availableOperatorsLoading = signal<boolean>(false);

  // Formularios
  protected readonly editForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    address: ['', Validators.required]
  });

  protected readonly assignDoctorForm = this.fb.nonNullable.group({
    doctorId: ['', Validators.required]
  });

  protected readonly assignServiceForm = this.fb.nonNullable.group({
    serviceId: [0, [Validators.required, Validators.min(1)]]
  });

  protected readonly assignOperatorForm = this.fb.nonNullable.group({
    operatorId: ['', Validators.required]
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

  loadDoctors(): void {
    this.doctorsLoading.set(true);
    this.establishmentApi.getDoctors(this.establishmentId, 0, 100).subscribe({
      next: (page) => {
        this.doctors.set(page.content || []);
        this.doctorsLoading.set(false);
      },
      error: () => {
        this.doctorsLoading.set(false);
      }
    });
  }

  loadServices(): void {
    this.servicesLoading.set(true);
    this.establishmentApi.getServices(this.establishmentId, 0, 100).subscribe({
      next: (page) => {
        this.services.set(page.content || []);
        this.servicesLoading.set(false);
      },
      error: () => {
        this.servicesLoading.set(false);
      }
    });
  }

  loadOperators(): void {
    this.operatorsLoading.set(true);
    this.establishmentApi.getOperators(this.establishmentId, 0, 100).subscribe({
      next: (page) => {
        this.operators.set(page.content || []);
        this.operatorsLoading.set(false);
      },
      error: () => {
        this.operatorsLoading.set(false);
      }
    });
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

  // --- Modal Asignar Doctor ---
  openAssignDoctorModal(): void {
    this.assignDoctorForm.reset({ doctorId: '' });
    this.isAssignDoctorModalOpen.set(true);

    if (this.availableDoctors().length === 0) {
      this.availableDoctorsLoading.set(true);
      this.doctorApi.getAll(0, 100).subscribe({
        next: (page) => {
          this.availableDoctors.set(page.content || []);
          this.availableDoctorsLoading.set(false);
        },
        error: () => {
          this.availableDoctorsLoading.set(false);
          alert('Error al cargar la lista de doctores.');
        }
      });
    }
  }

  closeAssignDoctorModal(): void {
    this.isAssignDoctorModalOpen.set(false);
  }

  onAssignDoctorSubmit(): void {
    if (this.assignDoctorForm.invalid) {
      this.assignDoctorForm.markAllAsTouched();
      return;
    }

    this.formLoading.set(true);
    const doctorId = this.assignDoctorForm.getRawValue().doctorId;

    this.doctorApi.assignToStablishment(doctorId, this.establishmentId).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeAssignDoctorModal();
        alert('Doctor asignado correctamente.');
        this.loadDoctors();
      },
      error: () => {
        this.formLoading.set(false);
        alert('Error al asignar el doctor al establecimiento.');
      }
    });
  }

  // --- Modal Asignar Servicio ---
  openAssignServiceModal(): void {
    this.assignServiceForm.reset({ serviceId: 0 });
    this.isAssignServiceModalOpen.set(true);

    if (this.availableServices().length === 0) {
      this.availableServicesLoading.set(true);
      this.servicioApi.getAll(0, 100).subscribe({
        next: (page) => {
          this.availableServices.set(page.content || []);
          this.availableServicesLoading.set(false);
        },
        error: () => {
          this.availableServicesLoading.set(false);
          alert('Error al cargar la lista de servicios.');
        }
      });
    }
  }

  closeAssignServiceModal(): void {
    this.isAssignServiceModalOpen.set(false);
  }

  onAssignServiceSubmit(): void {
    if (this.assignServiceForm.invalid) {
      this.assignServiceForm.markAllAsTouched();
      return;
    }

    this.formLoading.set(true);
    const serviceId = Number(this.assignServiceForm.getRawValue().serviceId);

    this.establishmentApi.assignService(this.establishmentId, serviceId).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeAssignServiceModal();
        alert('Servicio asignado correctamente.');
        this.loadServices();
      },
      error: () => {
        this.formLoading.set(false);
        alert('Error al asignar el servicio al establecimiento.');
      }
    });
  }

  // --- Modal Asignar Operador ---
  openAssignOperatorModal(): void {
    this.assignOperatorForm.reset({ operatorId: '' });
    this.isAssignOperatorModalOpen.set(true);

    if (this.availableOperators().length === 0) {
      this.availableOperatorsLoading.set(true);
      this.operatorApi.getAll(0, 100).subscribe({
        next: (page) => {
          this.availableOperators.set(page.content || []);
          this.availableOperatorsLoading.set(false);
        },
        error: () => {
          this.availableOperatorsLoading.set(false);
          alert('Error al cargar la lista de operadores.');
        }
      });
    }
  }

  closeAssignOperatorModal(): void {
    this.isAssignOperatorModalOpen.set(false);
  }

  onAssignOperatorSubmit(): void {
    if (this.assignOperatorForm.invalid) {
      this.assignOperatorForm.markAllAsTouched();
      return;
    }

    this.formLoading.set(true);
    const operatorId = this.assignOperatorForm.getRawValue().operatorId;

    this.operatorApi.assignToStablishment(operatorId, this.establishmentId).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeAssignOperatorModal();
        alert('Operador asignado correctamente.');
        this.loadOperators();
      },
      error: () => {
        this.formLoading.set(false);
        alert('Error al asignar el operador al establecimiento.');
      }
    });
  }
}
