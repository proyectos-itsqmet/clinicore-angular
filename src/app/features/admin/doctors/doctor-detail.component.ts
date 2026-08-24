import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DoctorApiService } from '../../../core/api/doctor-api.service';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { ServicioApiService } from '../../../core/api/servicio-api.service';
import { ScheduleApiService } from '../../../core/api/schedule-api.service';
import type { AdminDoctor, Establishment, Servicio, GenerateSchedulesRequest } from '../../../core/models';

@Component({
  selector: 'app-doctor-detail',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './doctor-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly doctorApi = inject(DoctorApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly servicioApi = inject(ServicioApiService);
  private readonly scheduleApi = inject(ScheduleApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly doctor = signal<AdminDoctor | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  // Modales
  protected readonly isEditModalOpen = signal<boolean>(false);
  protected readonly isAssignEstModalOpen = signal<boolean>(false);
  protected readonly isAssignServiceModalOpen = signal<boolean>(false);
  protected readonly isGenerateScheduleModalOpen = signal<boolean>(false);
  protected readonly selectedServiceForSchedule = signal<Servicio | null>(null);
  protected readonly formLoading = signal<boolean>(false);

  // Catálogos para asignación
  protected readonly establishments = signal<Establishment[]>([]);
  protected readonly establishmentsLoading = signal<boolean>(false);
  protected readonly services = signal<Servicio[]>([]);
  protected readonly servicesLoading = signal<boolean>(false);
  protected readonly selectedServiceIds = signal<number[]>([]);

  // Formularios
  protected readonly editForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    speciality: ['', Validators.required],
    gender: ['GENDER_MALE', Validators.required],
    ci: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]]
  });

  protected readonly assignEstForm = this.fb.nonNullable.group({
    stablishmentId: [0, [Validators.required, Validators.min(1)]]
  });

  protected readonly scheduleForm = this.fb.nonNullable.group({
    stablishmentId: [0, [Validators.required, Validators.min(1)]],
    date: ['', Validators.required],
    intervalMinutes: [60, [Validators.required]]
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
    const estId = this.assignEstForm.getRawValue().stablishmentId;

    this.doctorApi.assignToStablishment(this.doctorId, estId).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeAssignEstModal();
        alert('Establecimiento asignado correctamente.');
        this.loadDoctor();
      },
      error: () => {
        this.formLoading.set(false);
        alert('Error al asignar el establecimiento.');
      }
    });
  }

  // --- Modal Asignar Servicios ---
  openAssignServiceModal(): void {
    this.selectedServiceIds.set([]);
    this.isAssignServiceModalOpen.set(true);

    if (this.services().length === 0) {
      this.servicesLoading.set(true);
      this.servicioApi.getAll(0, 100).subscribe({
        next: (page) => {
          this.services.set(page.content);
          this.servicesLoading.set(false);
        },
        error: () => {
          this.servicesLoading.set(false);
          alert('Error al cargar la lista de servicios.');
        }
      });
    }
  }

  closeAssignServiceModal(): void {
    this.isAssignServiceModalOpen.set(false);
    this.selectedServiceIds.set([]);
  }

  toggleServiceSelection(serviceId: number): void {
    const current = this.selectedServiceIds();
    if (current.includes(serviceId)) {
      this.selectedServiceIds.set(current.filter(id => id !== serviceId));
    } else {
      this.selectedServiceIds.set([...current, serviceId]);
    }
  }

  onAssignServiceSubmit(): void {
    const serviceIds = this.selectedServiceIds();
    if (serviceIds.length === 0) {
      alert('Por favor selecciona al menos un servicio.');
      return;
    }

    this.formLoading.set(true);
    const requests$ = serviceIds.map(serviceId => this.doctorApi.assignToService(this.doctorId, serviceId));

    forkJoin(requests$).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeAssignServiceModal();
        alert(`${serviceIds.length} servicio(s) asignado(s) correctamente.`);
        this.loadDoctor();
      },
      error: () => {
        this.formLoading.set(false);
        alert('Error al asignar los servicios al doctor.');
      }
    });
  }

  // --- Modal Generar Horarios ---
  openGenerateScheduleModal(service: Servicio): void {
    this.selectedServiceForSchedule.set(service);
    const doctorEsts = this.doctor()?.stablishments || [];
    const defaultEstId = doctorEsts.length > 0 ? doctorEsts[0].id : 0;
    const today = new Date().toISOString().split('T')[0];

    this.scheduleForm.reset({
      stablishmentId: defaultEstId,
      date: today,
      intervalMinutes: 60
    });

    this.isGenerateScheduleModalOpen.set(true);
  }

  closeGenerateScheduleModal(): void {
    this.isGenerateScheduleModalOpen.set(false);
    this.selectedServiceForSchedule.set(null);
  }

  onGenerateScheduleSubmit(): void {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }

    const service = this.selectedServiceForSchedule();
    if (!service) return;

    this.formLoading.set(true);
    const formVal = this.scheduleForm.getRawValue();

    const payload: GenerateSchedulesRequest = {
      serviceId: service.id,
      stablishmentId: Number(formVal.stablishmentId),
      doctorId: this.doctor()?.uuid || this.doctorId,
      date: formVal.date,
      intervalMinutes: Number(formVal.intervalMinutes)
    };

    this.scheduleApi.generateSchedules(payload).subscribe({
      next: (result) => {
        this.formLoading.set(false);
        this.closeGenerateScheduleModal();
        const count = result?.length ?? 0;
        alert(`Horarios generados correctamente (${count} cupo${count === 1 ? '' : 's'} creado${count === 1 ? '' : 's'}).`);
      },
      error: (err) => {
        this.formLoading.set(false);
        const msg = err?.error?.message || 'Error al generar los horarios para el servicio.';
        alert(msg);
      }
    });
  }
}
