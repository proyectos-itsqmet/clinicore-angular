import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { localIsoDate } from '../../../core/date/local-iso-date';
import { SelectField, type SelectOption } from '../../../shared/ui/molecules/select-field/select-field';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServicioApiService } from '../../../core/api/servicio-api.service';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { DoctorApiService } from '../../../core/api/doctor-api.service';
import { ScheduleApiService } from '../../../core/api/schedule-api.service';
import { fetchAllPages } from '../../../core/api/fetch-all-pages.util';
import type { Servicio, AdminDoctor, ScheduleDTO, ScheduleStatus, Establishment, Page, CreateSchedulePayload } from '../../../core/models';

@Component({
  selector: 'app-specialty-detail',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, DecimalPipe, SelectField],
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

  // Todos los doctores para el selector al crear horario (catálogo completo:
  // ver `loadAllDoctors` — antes se pedía una única página fija de 100 y el
  // resto de doctores del sistema quedaba fuera del <select> sin aviso).
  protected readonly allDoctors = signal<AdminDoctor[]>([]);
  protected readonly allDoctorsIncomplete = signal<boolean>(false);

  // Horarios (Schedules) del Servicio
  protected readonly schedules = signal<Page<ScheduleDTO> | null>(null);
  protected readonly schedulesLoading = signal<boolean>(false);
  protected readonly schedulePage = signal<number>(0);

  // Filtros de Horarios
  protected readonly filterDate = signal<string>('');
  protected readonly filterStablishmentId = signal<number | null>(null);
  protected readonly filterStatus = signal<string>('');
  
  // Selección de Horarios
  protected readonly selectedScheduleIds = signal<Set<number>>(new Set());

  // Catálogo Global de Establecimientos (completo: ver `loadEstablishments`)
  protected readonly establishments = signal<Establishment[]>([]);
  protected readonly establishmentsIncomplete = signal<boolean>(false);

  // ==========================================================================
  // Opciones de los desplegables.
  // ==========================================================================

  protected readonly STATUS_FILTER_OPTIONS: readonly SelectOption[] = [
    { value: '', label: 'Todos los Estados' },
    { value: 'STATUS_FREE', label: 'Disponible', hint: 'Libre' },
    { value: 'STATUS_OCCUPIED', label: 'Ocupado', hint: 'Reservado' },
    { value: 'STATUS_UNAVAILABLE', label: 'No disponible' },
  ];

  /** Los intervalos de la generación por lote, con su uso clínico de apoyo. */
  protected readonly INTERVAL_OPTIONS: readonly SelectOption[] = [
    { value: '15', label: 'Cada 15 minutos', hint: 'Consulta rápida / Triaje' },
    { value: '20', label: 'Cada 20 minutos', hint: 'Consulta estándar' },
    { value: '30', label: 'Cada 30 minutos', hint: 'Revisión médica habitual — recomendado' },
    { value: '45', label: 'Cada 45 minutos', hint: 'Evaluación profunda' },
    { value: '60', label: 'Cada 60 minutos', hint: '1 hora — procedimientos' },
  ];

  protected readonly establishmentFilterOptions = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Todos los Establecimientos' },
    ...this.establishments().map((e) => ({ value: String(e.id), label: e.name })),
  ]);

  /**
   * Los doctores del formulario de horario.
   *
   * El `<optgroup>` "Doctores Asignados a este Servicio" que había acá se
   * APLANA: un `listbox` no anida grupos, y el dato que el grupo aportaba —
   * si el doctor ya está asignado a este servicio — cabe entero en el renglón
   * secundario de cada opción, donde además se lee sin tener que mirar bajo
   * qué encabezado cayó la fila.
   */
  protected readonly scheduleDoctorOptions = computed<readonly SelectOption[]>(() => {
    const assigned = this.doctors()?.content ?? [];
    const assignedIds = new Set(assigned.map((d) => d.uuid));
    const rest = this.allDoctors().filter((d) => !assignedIds.has(d.uuid));

    const toOption = (d: AdminDoctor, isAssigned: boolean): SelectOption => ({
      value: d.uuid,
      label: `Dr. ${d.firstName} ${d.lastName}`,
      hint: isAssigned ? `${d.speciality} · asignado a este servicio` : d.speciality,
    });

    return [...assigned.map((d) => toOption(d, true)), ...rest.map((d) => toOption(d, false))];
  });

  protected readonly scheduleEstablishmentOptions = computed<readonly SelectOption[]>(() =>
    this.establishments().map((e) => ({
      value: String(e.id),
      label: e.name,
      hint: e.address,
    })),
  );

  /** Prefiere los establecimientos ASIGNADOS; cae al catálogo completo si no hay. */
  protected readonly batchEstablishmentOptions = computed<readonly SelectOption[]>(() => {
    const assigned = this.assignedEstablishments()?.content ?? [];
    const source = assigned.length > 0 ? assigned : this.establishments();
    return source.map((e) => ({ value: String(e.id), label: e.name, hint: e.address }));
  });

  /** Igual, con "sin doctor" adelante: en un lote es una elección válida. */
  protected readonly batchDoctorOptions = computed<readonly SelectOption[]>(() => {
    const scoped = this.doctors()?.content ?? [];
    const source = scoped.length > 0 ? scoped : this.allDoctors();
    return [
      { value: '', label: 'Sin doctor específico', hint: 'Disponible para cualquier médico' },
      ...source.map((d) => ({
        value: d.uuid,
        label: `Dr. ${d.firstName} ${d.lastName}`,
        hint: d.speciality,
      })),
    ];
  });

  // Modales
  protected readonly isEditModalOpen = signal<boolean>(false);
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly isCreateScheduleModalOpen = signal<boolean>(false);
  protected readonly isGenerateBatchModalOpen = signal<boolean>(false);
  protected readonly isAssignEstablishmentModalOpen = signal<boolean>(false);
  protected readonly isAssignDoctorModalOpen = signal<boolean>(false);
  protected readonly formLoading = signal<boolean>(false);
  protected readonly createScheduleLoading = signal<boolean>(false);
  protected readonly generateBatchLoading = signal<boolean>(false);
  protected readonly generateBatchError = signal<string | null>(null);
  protected readonly generateBatchSuccess = signal<string | null>(null);

  // Búsqueda y Asignación de Doctores al Servicio
  protected readonly candidateDoctorName = signal<string>('');
  protected readonly candidateDoctorCi = signal<string>('');
  protected readonly candidateDoctors = signal<Page<AdminDoctor> | null>(null);
  protected readonly candidateDoctorsLoading = signal<boolean>(false);
  protected readonly candidateDoctorsPage = signal<number>(0);
  protected readonly assigningDoctorUuid = signal<string | null>(null);
  protected readonly assignDoctorSuccess = signal<string | null>(null);
  protected readonly assignDoctorError = signal<string | null>(null);

  // Búsqueda y Asignación de Establecimientos al Servicio
  protected readonly candidateEstName = signal<string>('');
  protected readonly candidateEstablishments = signal<Page<Establishment> | null>(null);
  protected readonly candidateEstLoading = signal<boolean>(false);
  protected readonly candidateEstPage = signal<number>(0);
  protected readonly assigningEstId = signal<number | null>(null);
  protected readonly assignEstSuccess = signal<string | null>(null);
  protected readonly assignEstError = signal<string | null>(null);

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

  // Formulario de creación de horario individual
  protected readonly createScheduleForm = this.fb.nonNullable.group({
    date: ['', Validators.required],
    hour: ['12:00', Validators.required],
    doctorUuid: ['', Validators.required],
    stablishmentId: [0, [Validators.required, Validators.min(1)]]
  });

  // Formulario de generación de turnos en lote (/api/schedules/generate)
  protected readonly generateBatchForm = this.fb.nonNullable.group({
    date: ['', Validators.required],
    intervalMinutes: [30, [Validators.required, Validators.min(5), Validators.max(120)]],
    doctorUuid: [''],
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

  /**
   * Fallback pool of doctors for the "create schedule" picker, for doctors
   * not yet linked to this service. Used to feed a native `<select>`
   * (visual design frozen), so this loads the COMPLETE catalog across every
   * page instead of the old `getAll(0, 100)` — which silently hid every
   * doctor past record 100 with no error and no indication.
   */
  loadAllDoctors(): void {
    fetchAllPages((page) => this.doctorApi.getAll(page, 100)).subscribe({
      next: ({ items, complete }) => {
        this.allDoctors.set(items);
        this.allDoctorsIncomplete.set(!complete);
      },
      error: () => {
        // Fallback silencioso: el <select> queda con la última página cargada (si alguna).
      }
    });
  }

  loadSchedules(page: number = 0): void {
    this.schedulesLoading.set(true);
    this.schedulePage.set(page);
    this.selectedScheduleIds.set(new Set()); // Reset selection

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

  /**
   * Establishment catalog feeding the schedule filter and the create/batch
   * `<select>`s (visual design frozen). Loads every page instead of the old
   * `getAll(0, 100)`, which silently hid establishments past record 100.
   */
  loadEstablishments(): void {
    fetchAllPages((page) => this.establishmentApi.getAll(page, 100)).subscribe({
      next: ({ items, complete }) => {
        this.establishments.set(items);
        this.establishmentsIncomplete.set(!complete);
      },
      error: () => {
        // Fallback silencioso: el <select> queda con la última página cargada (si alguna).
      }
    });
  }

  // --- Selección Múltiple de Horarios ---
  toggleScheduleSelection(id: number): void {
    const current = new Set(this.selectedScheduleIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedScheduleIds.set(current);
  }

  toggleSelectAllSchedules(): void {
    const currentItems = this.schedules()?.content ?? [];
    const current = this.selectedScheduleIds();
    if (current.size === currentItems.length && currentItems.length > 0) {
      this.selectedScheduleIds.set(new Set());
    } else {
      this.selectedScheduleIds.set(new Set(currentItems.map((s) => s.id!)));
    }
  }

  isAllSchedulesSelected(): boolean {
    const currentItems = this.schedules()?.content ?? [];
    return currentItems.length > 0 && this.selectedScheduleIds().size === currentItems.length;
  }

  bulkDeleteSchedules(): void {
    const ids = Array.from(this.selectedScheduleIds());
    if (ids.length === 0) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar ${ids.length} horarios seleccionados?`)) return;

    this.scheduleApi.bulkDelete(ids).subscribe({
      next: () => {
        this.loadSchedules(this.schedulePage());
      },
      error: () => {
        alert('Ocurrió un error al intentar eliminar algunos horarios. Verifica que no estén reservados.');
      }
    });
  }

  bulkUpdateScheduleStatus(status: 'STATUS_FREE' | 'STATUS_UNAVAILABLE'): void {
    const ids = Array.from(this.selectedScheduleIds());
    if (ids.length === 0) return;

    this.scheduleApi.bulkUpdateStatus(status, ids).subscribe({
      next: () => {
        this.loadSchedules(this.schedulePage());
      },
      error: () => {
        alert('Ocurrió un error al actualizar los estados.');
      }
    });
  }

  // --- Manejo de Filtros de Horarios ---
  onDateFilterChange(date: string): void {
    this.filterDate.set(date);
    this.loadSchedules(0);
  }

  setTodayFilter(): void {
    const today = localIsoDate();
    this.filterDate.set(today);
    this.loadSchedules(0);
  }

  setTomorrowFilter(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = localIsoDate(tomorrow);
    this.filterDate.set(tomorrowStr);
    this.loadSchedules(0);
  }

  clearDateFilter(): void {
    this.filterDate.set('');
    this.loadSchedules(0);
  }

  onEstablishmentFilterChange(value: string): void {
    const estId = value ? Number(value) : null;
    this.filterStablishmentId.set(estId && !isNaN(estId) ? estId : null);
    this.loadSchedules(0);
  }

  onStatusFilterChange(value: string): void {
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
    const today = localIsoDate();
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

  // --- Modal Generación de Turnos en Lote (/api/schedules/generate) ---
  openGenerateBatchModal(): void {
    const today = localIsoDate();
    const firstEstId = this.assignedEstablishments()?.content?.[0]?.id || this.establishments()?.[0]?.id || 0;
    const firstDocUuid = this.doctors()?.content?.[0]?.uuid || '';

    this.generateBatchForm.reset({
      date: today,
      intervalMinutes: 30,
      doctorUuid: firstDocUuid,
      stablishmentId: firstEstId
    });

    this.generateBatchError.set(null);
    this.generateBatchSuccess.set(null);
    this.isGenerateBatchModalOpen.set(true);
  }

  closeGenerateBatchModal(): void {
    this.isGenerateBatchModalOpen.set(false);
  }

  onGenerateBatchSubmit(): void {
    if (this.generateBatchForm.invalid) {
      this.generateBatchForm.markAllAsTouched();
      return;
    }

    this.generateBatchLoading.set(true);
    this.generateBatchError.set(null);
    this.generateBatchSuccess.set(null);

    const val = this.generateBatchForm.getRawValue();

    const payload = {
      serviceId: this.serviceId,
      stablishmentId: Number(val.stablishmentId),
      doctorId: val.doctorUuid ? val.doctorUuid : (undefined as any),
      date: val.date,
      intervalMinutes: Number(val.intervalMinutes)
    };

    this.scheduleApi.generateSchedules(payload).subscribe({
      next: (schedules) => {
        this.generateBatchLoading.set(false);
        this.generateBatchSuccess.set(`¡Se han generado exitosamente ${schedules.length} turnos de atención para el ${val.date}!`);
        this.loadSchedules(0);
        setTimeout(() => {
          this.closeGenerateBatchModal();
        }, 1800);
      },
      error: (err) => {
        this.generateBatchLoading.set(false);
        const msg = err?.error?.message || err?.error?.error || 'No se pudieron generar los turnos en lote. Verifica que el doctor y el servicio pertenezcan a la sede seleccionada.';
        this.generateBatchError.set(msg);
      }
    });
  }

  // --- Modal Asignar Doctor al Servicio ---
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
        this.assignDoctorError.set('Error al buscar médicos.');
      }
    });
  }

  resetCandidateSearch(): void {
    this.candidateDoctorName.set('');
    this.candidateDoctorCi.set('');
    this.searchCandidateDoctors(0);
  }

  onAssignDoctor(doc: AdminDoctor): void {
    if (!doc.uuid) return;
    this.assigningDoctorUuid.set(doc.uuid);
    this.assignDoctorSuccess.set(null);
    this.assignDoctorError.set(null);

    this.doctorApi.assignToService(doc.uuid, this.serviceId).subscribe({
      next: () => {
        this.assigningDoctorUuid.set(null);
        this.assignDoctorSuccess.set(`Dr. ${doc.firstName} ${doc.lastName} asignado exitosamente.`);
        this.loadDoctors();
        this.loadAllDoctors();
      },
      error: (err) => {
        this.assigningDoctorUuid.set(null);
        const msg = err?.error?.message || err?.error?.Message || 'No se pudo asignar el doctor a este servicio.';
        this.assignDoctorError.set(msg);
      }
    });
  }

  // --- Modal Asignar Establecimiento al Servicio ---
  openAssignEstablishmentModal(): void {
    this.candidateEstName.set('');
    this.candidateEstablishments.set(null);
    this.assignEstSuccess.set(null);
    this.assignEstError.set(null);
    this.isAssignEstablishmentModalOpen.set(true);
    this.searchCandidateEstablishments(0);
  }

  closeAssignEstablishmentModal(): void {
    this.isAssignEstablishmentModalOpen.set(false);
  }

  searchCandidateEstablishments(page: number = 0): void {
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
    this.searchCandidateEstablishments(0);
  }

  onAssignEstablishment(est: Establishment): void {
    if (!est.id) return;
    this.assigningEstId.set(est.id);
    this.assignEstSuccess.set(null);
    this.assignEstError.set(null);

    this.servicioApi.assignStablishment(this.serviceId, est.id).subscribe({
      next: () => {
        this.assigningEstId.set(null);
        this.assignEstSuccess.set(`Sede "${est.name}" asignada exitosamente.`);
        this.loadAssignedEstablishments();
        this.loadEstablishments();
      },
      error: (err) => {
        this.assigningEstId.set(null);
        const msg = err?.error?.message || err?.error?.Message || 'No se pudo asignar el establecimiento.';
        this.assignEstError.set(msg);
      }
    });
  }

  onRevokeDoctor(doc: AdminDoctor): void {
    if (!doc.uuid) return;
    if (!confirm(`¿Estás seguro de que deseas desasignar al Dr. ${doc.firstName} ${doc.lastName} de este servicio?`)) return;

    this.servicioApi.revokeDoctor(this.serviceId, doc.uuid).subscribe({
      next: () => {
        alert('Doctor desasignado exitosamente.');
        this.loadDoctors();
        this.loadAllDoctors();
      },
      error: () => {
        alert('No se pudo desasignar al doctor.');
      }
    });
  }

  onRevokeEstablishment(est: Establishment): void {
    if (!est.id) return;
    if (!confirm(`¿Estás seguro de que deseas desasignar la sede "${est.name}" de este servicio?`)) return;

    this.servicioApi.revokeStablishment(this.serviceId, est.id).subscribe({
      next: () => {
        alert('Establecimiento desasignado exitosamente.');
        this.loadAssignedEstablishments();
        this.loadEstablishments();
      },
      error: () => {
        alert('No se pudo desasignar el establecimiento.');
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
