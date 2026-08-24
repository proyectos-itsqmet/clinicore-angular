import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServicioApiService } from '../../../core/api/servicio-api.service';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { DoctorApiService } from '../../../core/api/doctor-api.service';
import { ScheduleApiService } from '../../../core/api/schedule-api.service';
import type { Servicio, AdminDoctor, ScheduleDTO, ScheduleStatus, Establishment, Page, CreateSchedulePayload } from '../../../core/models';

@Component({
  selector: 'app-specialty-detail',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, DecimalPipe],
  templateUrl: './specialty-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecialtyDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicioApi = inject(ServicioApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly doctorApi = inject(DoctorApiService);
  private readonly scheduleApi = inject(ScheduleApiService);
  private readonly fb = inject(FormBuilder);

  // Estado del Servicio
  protected readonly service = signal<Servicio | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  // Doctores del Servicio
  protected readonly doctors = signal<Page<AdminDoctor> | null>(null);
  protected readonly doctorsLoading = signal<boolean>(false);
  protected readonly doctorSearch = signal<string>('');

  // Establecimientos Asignados al Servicio
  protected readonly assignedEstablishments = signal<Page<Establishment> | null>(null);
  protected readonly assignedEstablishmentsLoading = signal<boolean>(false);
  protected readonly establishmentSearch = signal<string>('');

  // Todos los doctores para el selector al crear horario
  protected readonly allDoctors = signal<AdminDoctor[]>([]);

  // Horarios (Schedules) del Servicio
  protected readonly schedules = signal<Page<ScheduleDTO> | null>(null);
  protected readonly schedulesLoading = signal<boolean>(false);
  protected readonly schedulePage = signal<number>(0);

  // Filtros de Horarios
  protected readonly filterDate = signal<string>('');
  protected readonly filterStablishmentId = signal<number | null>(null);
  protected readonly filterStatus = signal<string>('');

  // Catálogo Global de Establecimientos
  protected readonly establishments = signal<Establishment[]>([]);

  // Modales
  protected readonly isEditModalOpen = signal<boolean>(false);
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly isCreateScheduleModalOpen = signal<boolean>(false);
  protected readonly isAssignEstablishmentModalOpen = signal<boolean>(false);
  protected readonly formLoading = signal<boolean>(false);
  protected readonly createScheduleLoading = signal<boolean>(false);

  // Formulario de edición de servicio
  protected readonly editForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    discount: [0, Validators.min(0)]
  });

  // Formulario de asignación de establecimiento
  protected readonly assignEstablishmentForm = this.fb.nonNullable.group({
    stablishmentId: [0, [Validators.required, Validators.min(1)]]
  });

  // Formulario de creación de horario
  protected readonly createScheduleForm = this.fb.nonNullable.group({
    date: ['', Validators.required],
    hour: ['12:00', Validators.required],
    doctorUuid: ['', Validators.required],
    stablishmentId: [0, [Validators.required, Validators.min(1)]]
  });

  private serviceId: number = 0;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id') || this.route.snapshot.paramMap.get('id');
      const parsedId = Number(idParam);
      if (parsedId && !isNaN(parsedId)) {
        this.serviceId = parsedId;
        this.loadService();
        this.loadDoctors();
        this.loadAssignedEstablishments();
        this.loadSchedules();
        this.loadEstablishments();
        this.loadAllDoctors();
      } else {
        this.error.set('Identificador de servicio no válido.');
        this.loading.set(false);
      }
    });
  }

  loadService(): void {
    this.loading.set(true);
    this.error.set(null);
    this.servicioApi.getById(this.serviceId).subscribe({
      next: (serv) => {
        this.service.set(serv);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la información del servicio.');
        this.loading.set(false);
      }
    });
  }

  loadDoctors(page: number = 0): void {
    this.doctorsLoading.set(true);
    const search = this.doctorSearch().trim() || undefined;
    this.servicioApi.getDoctors(this.serviceId, search, page, 10).subscribe({
      next: (pageData) => {
        this.doctors.set(pageData);
        this.doctorsLoading.set(false);
      },
      error: () => {
        this.doctorsLoading.set(false);
      }
    });
  }

  loadAssignedEstablishments(page: number = 0): void {
    this.assignedEstablishmentsLoading.set(true);
    const search = this.establishmentSearch().trim() || undefined;
    this.servicioApi.getStablishments(this.serviceId, search, page, 10).subscribe({
      next: (pageData) => {
        this.assignedEstablishments.set(pageData);
        this.assignedEstablishmentsLoading.set(false);
      },
      error: () => {
        this.assignedEstablishmentsLoading.set(false);
      }
    });
  }

  loadAllDoctors(): void {
    this.doctorApi.getAll(0, 100).subscribe({
      next: (page) => {
        this.allDoctors.set(page.content);
      },
      error: () => {
        // Fallback silencioso
      }
    });
  }

  loadSchedules(page: number = 0): void {
    this.schedulesLoading.set(true);
    this.schedulePage.set(page);

    const filters: { stablishmentId?: number; date?: string; status?: ScheduleStatus | string } = {};
    if (this.filterStablishmentId()) {
      filters.stablishmentId = this.filterStablishmentId()!;
    }
    if (this.filterDate()) {
      filters.date = this.filterDate();
    }
    if (this.filterStatus()) {
      filters.status = this.filterStatus();
    }

    this.servicioApi.getSchedules(this.serviceId, filters, page, 12).subscribe({
      next: (pageData) => {
        this.schedules.set(pageData);
        this.schedulesLoading.set(false);
      },
      error: () => {
        this.schedulesLoading.set(false);
      }
    });
  }

  loadEstablishments(): void {
    this.establishmentApi.getAll(0, 100).subscribe({
      next: (page) => {
        this.establishments.set(page.content);
      },
      error: () => {
        // Fallback silencioso
      }
    });
  }

  // --- Manejo de Filtros de Horarios ---
  onDateFilterChange(date: string): void {
    this.filterDate.set(date);
    this.loadSchedules(0);
  }

  setTodayFilter(): void {
    const today = new Date().toISOString().split('T')[0];
    this.filterDate.set(today);
    this.loadSchedules(0);
  }

  setTomorrowFilter(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    this.filterDate.set(tomorrowStr);
    this.loadSchedules(0);
  }

  clearDateFilter(): void {
    this.filterDate.set('');
    this.loadSchedules(0);
  }

  onEstablishmentFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const estId = value ? Number(value) : null;
    this.filterStablishmentId.set(estId && !isNaN(estId) ? estId : null);
    this.loadSchedules(0);
  }

  onStatusFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterStatus.set(value);
    this.loadSchedules(0);
  }

  resetAllScheduleFilters(): void {
    this.filterDate.set('');
    this.filterStablishmentId.set(null);
    this.filterStatus.set('');
    this.loadSchedules(0);
  }

  // --- Modal Crear Horario ---
  openCreateScheduleModal(): void {
    const today = new Date().toISOString().split('T')[0];
    const defaultDoctorUuid = this.doctors()?.content?.[0]?.uuid || this.allDoctors()?.[0]?.uuid || '';
    const defaultEstId = this.assignedEstablishments()?.content?.[0]?.id || this.establishments()?.[0]?.id || 0;

    this.createScheduleForm.reset({
      date: today,
      hour: '12:00',
      doctorUuid: defaultDoctorUuid,
      stablishmentId: defaultEstId
    });

    this.isCreateScheduleModalOpen.set(true);
  }

  closeCreateScheduleModal(): void {
    this.isCreateScheduleModalOpen.set(false);
  }

  onCreateScheduleSubmit(): void {
    if (this.createScheduleForm.invalid) {
      this.createScheduleForm.markAllAsTouched();
      return;
    }

    this.createScheduleLoading.set(true);
    const formVal = this.createScheduleForm.getRawValue();

    let formattedHour = formVal.hour.trim();
    if (formattedHour.length === 5) {
      formattedHour += ':00';
    }

    const payload: CreateSchedulePayload = {
      date: formVal.date,
      hour: formattedHour,
      doctor: {
        uuid: formVal.doctorUuid
      },
      service: {
        id: this.serviceId
      },
      stablishment: {
        id: Number(formVal.stablishmentId)
      }
    };

    this.scheduleApi.create(payload).subscribe({
      next: (created) => {
        this.createScheduleLoading.set(false);
        this.closeCreateScheduleModal();
        alert(`¡Horario para el ${created.date} a las ${created.hour} creado exitosamente!`);
        this.loadSchedules(0);
      },
      error: (err) => {
        this.createScheduleLoading.set(false);
        const msg = err?.error?.message || err?.error?.error || 'Error al crear el horario.';
        alert(msg);
      }
    });
  }

  // --- Modal Asignar Establecimiento ---
  openAssignEstablishmentModal(): void {
    const firstEstId = this.establishments()?.[0]?.id || 0;
    this.assignEstablishmentForm.reset({ stablishmentId: firstEstId });
    this.isAssignEstablishmentModalOpen.set(true);
  }

  closeAssignEstablishmentModal(): void {
    this.isAssignEstablishmentModalOpen.set(false);
  }

  onAssignEstablishmentSubmit(): void {
    if (this.assignEstablishmentForm.invalid) {
      this.assignEstablishmentForm.markAllAsTouched();
      return;
    }

    this.formLoading.set(true);
    const estId = Number(this.assignEstablishmentForm.getRawValue().stablishmentId);

    this.servicioApi.assignStablishment(this.serviceId, estId).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeAssignEstablishmentModal();
        alert('Establecimiento asignado correctamente al servicio.');
        this.loadAssignedEstablishments();
      },
      error: () => {
        this.formLoading.set(false);
        alert('Error al asignar el establecimiento.');
      }
    });
  }

  // --- Modal Editar Servicio ---
  openEditModal(): void {
    const serv = this.service();
    if (!serv) return;

    this.editForm.patchValue({
      name: serv.name,
      price: serv.price,
      discount: serv.discount ?? 0
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

    this.servicioApi.update(this.serviceId, payload).subscribe({
      next: (updatedServ) => {
        this.formLoading.set(false);
        this.closeEditModal();
        this.service.set(updatedServ);
        alert('Servicio actualizado correctamente.');
      },
      error: () => {
        this.formLoading.set(false);
        alert('Error al actualizar el servicio.');
      }
    });
  }

  // --- Modal Eliminar Servicio ---
  openDeleteModal(): void {
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
  }

  confirmDelete(): void {
    this.formLoading.set(true);
    this.servicioApi.delete(this.serviceId).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeDeleteModal();
        alert('Servicio eliminado correctamente.');
        this.router.navigate(['/admin/administracion/especialidades']);
      },
      error: () => {
        this.formLoading.set(false);
        alert('Error al eliminar el servicio.');
        this.closeDeleteModal();
      }
    });
  }
}
