import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PatientApiService } from '../../../core/api/patient-api.service';
import { TurnApiService } from '../../../core/api/turn-api.service';
import { ScheduleApiService } from '../../../core/api/schedule-api.service';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { ServicioApiService } from '../../../core/api/servicio-api.service';
import { CoveragePlanApiService } from '../../../core/api/coverage-plan-api.service';
import { PatientCoverageApiService } from '../../../core/api/patient-coverage-api.service';
import { AiApiService } from '../../../core/api/ai-api.service';
import { fetchAllPages } from '../../../core/api/fetch-all-pages.util';
import { extractApiErrorMessage, formatIsoDateEs, isPermissionDeniedError } from '../metrics-shared/turn-status.util';
import { coveragePlanPricingSummary } from '../coverage/coverage-plan-pricing.util';
import type { ClinicalSummary, CoveragePlan, Page, Patient, PatientCoverage, Turn, TurnFilterParams, TurnStatus, ScheduleDTO, Establishment, Servicio } from '../../../core/models';

@Component({
  selector: 'app-patient-detail',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './patient-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly patientApi = inject(PatientApiService);
  private readonly turnApi = inject(TurnApiService);
  private readonly scheduleApi = inject(ScheduleApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly servicioApi = inject(ServicioApiService);
  private readonly coveragePlanApi = inject(CoveragePlanApiService);
  private readonly patientCoverageApi = inject(PatientCoverageApiService);
  private readonly aiApi = inject(AiApiService);
  private readonly fb = inject(FormBuilder);

  protected patientId = '';
  protected readonly patient = signal<Patient | null>(null);
  protected readonly patientLoading = signal<boolean>(true);
  protected readonly patientError = signal<string | null>(null);

  // Turnos del paciente
  protected readonly turnsData = signal<Page<Turn> | null>(null);
  protected readonly turnsLoading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly actionMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  protected readonly filterForm = this.fb.nonNullable.group({
    status: [''],
    from: [''],
    to: [''],
    sort: ['createdAt,desc']
  });

  // Modal para Asignar Turno Inicial
  protected readonly isAssignTurnModalOpen = signal<boolean>(false);
  protected readonly schedulesData = signal<Page<ScheduleDTO> | null>(null);
  protected readonly schedulesLoading = signal<boolean>(false);
  protected readonly schedulesError = signal<string | null>(null);
  protected readonly selectedSchedule = signal<ScheduleDTO | null>(null);
  protected readonly assigningTurn = signal<boolean>(false);

  // Catálogo de establecimientos para filtrar (completo: ver `loadEstablishments`)
  protected readonly establishments = signal<Establishment[]>([]);
  protected readonly establishmentsLoading = signal<boolean>(false);
  protected readonly establishmentsError = signal<string | null>(null);
  protected readonly establishmentsIncomplete = signal<boolean>(false);

  // Catálogo de servicios para filtrar (el backend rechaza reasignar a otro
  // servicio). Completo: ver `loadServices`.
  protected readonly services = signal<Servicio[]>([]);
  protected readonly servicesLoading = signal<boolean>(false);
  protected readonly servicesError = signal<string | null>(null);
  protected readonly servicesIncomplete = signal<boolean>(false);

  // Formulario de búsqueda de horarios para Asignación
  protected readonly scheduleSearchForm = this.fb.nonNullable.group({
    date: [''],
    stablishmentId: [''],
    serviceId: [''],
    doctorName: ['']
  });

  // --- MODAL REASIGNACIÓN DE TURNO ---
  protected readonly isReassignModalOpen = signal<boolean>(false);
  protected readonly turnToReassign = signal<Turn | null>(null);
  protected readonly reassignSchedulesData = signal<Page<ScheduleDTO> | null>(null);
  protected readonly reassignSchedulesLoading = signal<boolean>(false);
  protected readonly reassignSchedulesError = signal<string | null>(null);
  protected readonly selectedReassignSchedule = signal<ScheduleDTO | null>(null);
  protected readonly reassigningTurn = signal<boolean>(false);

  protected readonly reassignSearchForm = this.fb.nonNullable.group({
    date: [''],
    stablishmentId: [''],
    serviceId: [''],
    doctorName: ['']
  });

  // --- MODAL CANCELACIÓN POR PERSONAL ---
  protected readonly isCancelModalOpen = signal<boolean>(false);
  protected readonly turnToCancel = signal<Turn | null>(null);
  protected readonly cancelReason = signal<string>('');
  protected readonly cancellingTurn = signal<boolean>(false);

  // --- ACCIÓN MARCAR COMO TRATADO ---
  protected readonly markingTreatedId = signal<number | null>(null);

  // --- Coberturas de Seguro ("Coberturas" tab) ---
  // Carga PEREZOSA a propósito: solo se dispara al entrar a esta pestaña, no
  // en ngOnInit — así no se suma una 5ta petición paralela a las cuatro que
  // esta pantalla ya dispara al cargar, y las specs existentes que nunca
  // tocan esta pestaña no necesitan flushear nada nuevo.
  protected readonly activeSection = signal<'turnos' | 'coberturas' | 'resumen'>('turnos');

  // --- Resumen clínico con IA ("Resumen" tab) ---
  // NO se dispara al entrar a la pestaña, a diferencia de Coberturas: cada
  // llamada gasta tokens de un proveedor externo y deja un asiento en
  // ClinicalAccessLog. Entrar a mirar no es lo mismo que pedir un resumen, así
  // que hace falta un clic explícito en "Generar resumen".
  protected readonly summary = signal<ClinicalSummary | null>(null);
  protected readonly summaryLoading = signal<boolean>(false);
  protected readonly summaryError = signal<string | null>(null);
  // Los registros de origen arrancan colapsados, pero SIEMPRE disponibles: son
  // lo que le permite al médico verificar que el resumen no inventó nada.
  protected readonly showSummarySources = signal<boolean>(false);

  protected readonly coverages = signal<PatientCoverage[]>([]);
  protected readonly coveragesLoading = signal<boolean>(false);
  protected readonly coveragesError = signal<string | null>(null);
  // Distingue "no tienes permiso" (esperado para ROLE_DOCTOR, ver
  // PatientCoverageAccessGuard) de una falla real, para no asustar con un
  // banner rojo genérico algo que es un resultado normal para un rol legítimo.
  protected readonly coveragesPermissionDenied = signal<boolean>(false);

  protected readonly coveragePlanPricingSummary = coveragePlanPricingSummary;
  protected readonly formatIsoDateEs = formatIsoDateEs;

  // Catálogo de planes de cobertura para el <select> del modal de asignación.
  protected readonly coveragePlansCatalog = signal<CoveragePlan[]>([]);
  protected readonly coveragePlansCatalogLoading = signal<boolean>(false);
  protected readonly coveragePlansCatalogError = signal<string | null>(null);
  protected readonly coveragePlansCatalogIncomplete = signal<boolean>(false);

  // --- Modal Asignar/Editar Cobertura ---
  protected readonly isCoverageModalOpen = signal<boolean>(false);
  protected readonly editingCoverage = signal<PatientCoverage | null>(null);
  protected readonly coverageFormLoading = signal<boolean>(false);
  protected readonly coverageFormError = signal<string | null>(null);
  protected readonly coverageSubmitAttempted = signal<boolean>(false);

  protected readonly coverageFormPlanId = signal<number | null>(null);
  protected readonly coverageFormPolicyNumber = signal<string>('');
  protected readonly coverageFormValidFrom = signal<string>('');
  protected readonly coverageFormValidUntil = signal<string>('');
  protected readonly coverageFormActive = signal<boolean>(true);

  protected readonly coverageFormValid = computed(
    () => this.coverageFormPlanId() != null && !!this.coverageFormPolicyNumber().trim() && !!this.coverageFormValidFrom(),
  );

  /** The plan currently picked in the form, so the modal can echo ITS OWN pricing rule at the point of entry — same wording as `coverage-list.component`, never re-worded per screen. */
  protected readonly coverageFormSelectedPlan = computed(
    () => this.coveragePlansCatalog().find((p) => p.id === this.coverageFormPlanId()) ?? null,
  );

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('id') || '';
    if (this.patientId) {
      this.loadPatientInfo();
      this.loadTurns(0);
      this.loadEstablishments();
      this.loadServices();
    } else {
      this.error.set('Identificador de paciente no válido.');
      this.turnsLoading.set(false);
      this.patientLoading.set(false);
    }
  }

  loadEstablishments(): void {
    this.establishmentsLoading.set(true);
    this.establishmentsError.set(null);
    fetchAllPages((page) => this.establishmentApi.getAll(page, 100)).subscribe({
      next: ({ items, complete }) => {
        this.establishments.set(items);
        this.establishmentsIncomplete.set(!complete);
        this.establishmentsLoading.set(false);
      },
      error: () => {
        this.establishmentsError.set('No se pudieron cargar los establecimientos disponibles.');
        this.establishmentsLoading.set(false);
      }
    });
  }

  /** Catálogo para el filtro de servicio: el backend ahora rechaza reasignar a un servicio distinto. */
  loadServices(): void {
    this.servicesLoading.set(true);
    this.servicesError.set(null);
    fetchAllPages((page) => this.servicioApi.getAll(page, 100)).subscribe({
      next: ({ items, complete }) => {
        this.services.set(items);
        this.servicesIncomplete.set(!complete);
        this.servicesLoading.set(false);
      },
      error: () => {
        this.servicesError.set('No se pudieron cargar los servicios disponibles.');
        this.servicesLoading.set(false);
      }
    });
  }

  loadPatientInfo(): void {
    this.patientLoading.set(true);
    this.patientError.set(null);
    this.patientApi.getById(this.patientId).subscribe({
      next: (data) => {
        this.patient.set(data);
        this.patientLoading.set(false);
      },
      error: () => {
        this.patientError.set('No se pudo cargar la información del paciente.');
        this.patientLoading.set(false);
      }
    });
  }

  loadTurns(page: number): void {
    this.turnsLoading.set(true);
    this.error.set(null);

    const formValues = this.filterForm.getRawValue();

    const params: TurnFilterParams = {
      status: formValues.status || undefined,
      from: formValues.from || undefined,
      to: formValues.to || undefined,
      sort: formValues.sort || undefined,
      page,
      size: 10
    };

    this.turnApi.getTurnsByPatient(this.patientId, params).subscribe({
      next: (pageData) => {
        this.turnsData.set(pageData);
        if (!this.patient() && pageData.content.length > 0 && pageData.content[0].patient) {
          this.patient.set(pageData.content[0].patient);
        }
        this.turnsLoading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los turnos del paciente.');
        this.turnsLoading.set(false);
      }
    });
  }

  onFilterSubmit(): void {
    this.loadTurns(0);
  }

  onFilterReset(): void {
    this.filterForm.reset({
      status: '',
      from: '',
      to: '',
      sort: 'createdAt,desc'
    });
    this.loadTurns(0);
  }

  // --- Lógica del Modal Asignar Turno ---

  openAssignTurnModal(): void {
    this.selectedSchedule.set(null);
    this.schedulesError.set(null);
    this.scheduleSearchForm.reset({
      date: '',
      stablishmentId: '',
      serviceId: '',
      doctorName: ''
    });
    this.isAssignTurnModalOpen.set(true);
    this.loadSchedules(0);
  }

  closeAssignTurnModal(): void {
    this.isAssignTurnModalOpen.set(false);
    this.selectedSchedule.set(null);
  }

  loadSchedules(page: number): void {
    this.schedulesLoading.set(true);
    this.schedulesError.set(null);

    const values = this.scheduleSearchForm.getRawValue();
    const stablishmentIdNum = values.stablishmentId ? Number(values.stablishmentId) : undefined;
    const serviceIdNum = values.serviceId ? Number(values.serviceId) : undefined;

    this.scheduleApi.getAll({
      date: values.date || undefined,
      stablishmentId: stablishmentIdNum,
      serviceId: serviceIdNum,
      doctorName: values.doctorName || undefined,
      page,
      size: 6
    }).subscribe({
      next: (pageData) => {
        this.schedulesData.set(pageData);
        this.schedulesLoading.set(false);
      },
      error: () => {
        this.schedulesError.set('No se pudieron cargar los horarios disponibles.');
        this.schedulesLoading.set(false);
      }
    });
  }

  onScheduleSearch(): void {
    this.loadSchedules(0);
  }

  onScheduleSearchReset(): void {
    this.scheduleSearchForm.reset({
      date: '',
      stablishmentId: '',
      serviceId: '',
      doctorName: ''
    });
    this.loadSchedules(0);
  }

  selectSchedule(schedule: ScheduleDTO): void {
    if (schedule.status === 'STATUS_OCCUPIED' || schedule.status === 'STATUS_UNAVAILABLE') {
      return;
    }
    this.selectedSchedule.set(schedule);
  }

  confirmAssignTurn(): void {
    const selected = this.selectedSchedule();
    if (!selected || !selected.id) {
      alert('Por favor selecciona un horario disponible.');
      return;
    }

    this.assigningTurn.set(true);
    const payload = {
      schedule: {
        id: selected.id
      },
      patient: {
        uuid: this.patientId
      }
    };

    this.turnApi.createByStaff(payload).subscribe({
      next: (createdTurn) => {
        this.assigningTurn.set(false);
        this.closeAssignTurnModal();
        this.actionMessage.set({
          type: 'success',
          text: `¡Turno #${createdTurn.order ?? ''} asignado exitosamente al paciente!`
        });
        this.loadTurns(0);
      },
      error: (err) => {
        this.assigningTurn.set(false);
        const msg = err?.error?.message || err?.error?.error || 'Error al asignar el turno al paciente.';
        this.actionMessage.set({ type: 'error', text: msg });
      }
    });
  }

  // --- Lógica del Modal Reasignar Turno (PUT /api/turns/{id}/reassign) ---

  openReassignModal(turn: Turn): void {
    this.turnToReassign.set(turn);
    this.selectedReassignSchedule.set(null);
    this.reassignSchedulesError.set(null);
    this.reassignSearchForm.reset({
      date: '',
      stablishmentId: turn.schedule?.stablishment?.id ? String(turn.schedule.stablishment.id) : '',
      // El backend rechaza reasignar a un servicio distinto del actual, así que
      // se precarga (igual que la sede) para que la búsqueda ya salga filtrada.
      serviceId: turn.schedule?.service?.id ? String(turn.schedule.service.id) : '',
      doctorName: ''
    });
    this.isReassignModalOpen.set(true);
    this.loadReassignSchedules(0);
  }

  closeReassignModal(): void {
    this.isReassignModalOpen.set(false);
    this.turnToReassign.set(null);
    this.selectedReassignSchedule.set(null);
  }

  loadReassignSchedules(page: number): void {
    this.reassignSchedulesLoading.set(true);
    this.reassignSchedulesError.set(null);

    const values = this.reassignSearchForm.getRawValue();
    const stablishmentIdNum = values.stablishmentId ? Number(values.stablishmentId) : undefined;
    const serviceIdNum = values.serviceId ? Number(values.serviceId) : undefined;

    this.scheduleApi.getAll({
      date: values.date || undefined,
      stablishmentId: stablishmentIdNum,
      serviceId: serviceIdNum,
      doctorName: values.doctorName || undefined,
      page,
      size: 6
    }).subscribe({
      next: (pageData) => {
        this.reassignSchedulesData.set(pageData);
        this.reassignSchedulesLoading.set(false);
      },
      error: () => {
        this.reassignSchedulesError.set('No se pudieron cargar los horarios disponibles para reasignar.');
        this.reassignSchedulesLoading.set(false);
      }
    });
  }

  onReassignSearch(): void {
    this.loadReassignSchedules(0);
  }

  onReassignSearchReset(): void {
    this.reassignSearchForm.reset({
      date: '',
      stablishmentId: '',
      serviceId: '',
      doctorName: ''
    });
    this.loadReassignSchedules(0);
  }

  selectReassignSchedule(schedule: ScheduleDTO): void {
    if (schedule.status === 'STATUS_OCCUPIED' || schedule.status === 'STATUS_UNAVAILABLE') {
      return;
    }
    this.selectedReassignSchedule.set(schedule);
  }

  confirmReassignTurn(): void {
    const turn = this.turnToReassign();
    const targetSchedule = this.selectedReassignSchedule();

    if (!turn || !targetSchedule || !targetSchedule.id) {
      alert('Por favor selecciona el nuevo horario para la cita.');
      return;
    }

    this.reassigningTurn.set(true);
    this.turnApi.reassign(turn.id, targetSchedule.id).subscribe({
      next: () => {
        this.reassigningTurn.set(false);
        this.closeReassignModal();
        this.actionMessage.set({
          type: 'success',
          text: `¡Turno #${turn.order} reasignado correctamente a la fecha ${targetSchedule.date} (${targetSchedule.hour})!`
        });
        this.loadTurns(0);
      },
      error: (err) => {
        this.reassigningTurn.set(false);
        const msg = err?.error?.error || err?.error?.message || 'Ocurrió un error al reasignar el turno.';
        this.actionMessage.set({ type: 'error', text: msg });
      }
    });
  }

  // --- Lógica del Modal Cancelar Turno por Personal (PUT /api/turns/{id}/staff-cancel) ---

  openCancelTurnModal(turn: Turn): void {
    this.turnToCancel.set(turn);
    this.cancelReason.set('');
    this.isCancelModalOpen.set(true);
  }

  closeCancelTurnModal(): void {
    this.isCancelModalOpen.set(false);
    this.turnToCancel.set(null);
    this.cancelReason.set('');
  }

  confirmCancelTurn(): void {
    const turn = this.turnToCancel();
    if (!turn) return;

    this.cancellingTurn.set(true);
    const reason = this.cancelReason().trim() || undefined;

    this.turnApi.cancelByStaff(turn.id, reason).subscribe({
      next: () => {
        this.cancellingTurn.set(false);
        this.closeCancelTurnModal();
        this.actionMessage.set({
          type: 'success',
          text: `El turno #${turn.order} ha sido cancelado por el personal exitosamente.`
        });
        this.loadTurns(0);
      },
      error: (err) => {
        this.cancellingTurn.set(false);
        const msg = err?.error?.error || err?.error?.message || 'Error al cancelar el turno.';
        this.actionMessage.set({ type: 'error', text: msg });
      }
    });
  }

  // --- Lógica Marcar como Tratado / Atendido (PUT /api/turns/{id}/treated) ---

  onMarkAsTreated(turn: Turn): void {
    if (!confirm(`¿Deseas marcar el turno #${turn.order} como ATENDIDO?`)) {
      return;
    }

    this.markingTreatedId.set(turn.id);
    this.turnApi.markAsTreated(turn.id).subscribe({
      next: () => {
        this.markingTreatedId.set(null);
        this.actionMessage.set({
          type: 'success',
          text: `El turno #${turn.order} se ha registrado como ATENDIDO.`
        });
        this.loadTurns(0);
      },
      error: (err) => {
        this.markingTreatedId.set(null);
        const msg = err?.error?.error || err?.error?.message || 'Error al actualizar el estado del turno.';
        this.actionMessage.set({ type: 'error', text: msg });
      }
    });
  }

  // --- Lógica de Coberturas de Seguro (GET/POST/PUT/DELETE /api/patient-coverages) ---

  selectSection(section: 'turnos' | 'coberturas' | 'resumen'): void {
    this.activeSection.set(section);
    if (section === 'coberturas') {
      this.loadCoverages();
      if (this.coveragePlansCatalog().length === 0 && !this.coveragePlansCatalogLoading()) {
        this.loadCoveragePlansCatalog();
      }
    }
    // 'resumen' no carga nada solo: ver el comentario del signal `summary`.
  }

  // --- Resumen clínico con IA (POST /api/patients/{id}/clinical-summary) ---

  /**
   * Pide el resumen. Lo genera n8n con Gemini a partir de los encuentros y
   * recetas de este paciente, DE-IDENTIFICADOS por el backend: al proveedor no
   * le llega nombre, cédula, dirección ni teléfono, solo edad, sexo y los
   * hechos clínicos.
   *
   * Puede tardar unos segundos y el médico está con el paciente enfrente, así
   * que el estado de carga tiene que ser visible y el botón quedar
   * deshabilitado: dos clics son dos llamadas pagadas y dos asientos de
   * auditoría por la misma consulta.
   */
  generateSummary(): void {
    if (this.summaryLoading()) {
      return;
    }
    this.summaryLoading.set(true);
    this.summaryError.set(null);

    this.aiApi.getClinicalSummary(this.patientId).subscribe({
      next: (result) => {
        this.summary.set(result);
        this.summaryLoading.set(false);
      },
      error: (err) => {
        this.summaryError.set(extractApiErrorMessage(err, 'No se pudo generar el resumen'));
        this.summaryLoading.set(false);
      },
    });
  }

  toggleSummarySources(): void {
    this.showSummarySources.update((open) => !open);
  }

  /**
   * El modelo devuelve los títulos en markdown (`**Alergias:**`). Se quitan los
   * asteriscos y se muestra como texto plano con los saltos de línea
   * preservados, en vez de renderizar HTML con `[innerHTML]`: este texto se
   * construye a partir de notas clínicas de texto libre, y no hay ninguna razón
   * para darle a ese contenido un camino hacia el DOM como marcado.
   */
  protected summaryText(): string {
    return (this.summary()?.resumen ?? '').replace(/\*\*/g, '');
  }

  /** true cuando el tope del servidor dejó encuentros afuera del resumen. */
  protected summaryTruncated(): boolean {
    const s = this.summary();
    return !!s && s.encuentrosResumidos < s.totalEncuentros;
  }

  loadCoverages(): void {
    this.coveragesLoading.set(true);
    this.coveragesError.set(null);
    this.coveragesPermissionDenied.set(false);

    this.patientCoverageApi.getForPatient(this.patientId).subscribe({
      next: (list) => {
        this.coverages.set(list);
        this.coveragesLoading.set(false);
      },
      error: (err) => {
        const message = extractApiErrorMessage(err, 'No se pudo cargar la información de cobertura del paciente.');
        if (isPermissionDeniedError(err, message)) {
          // Expected/normal for ROLE_DOCTOR (PatientCoverageAccessGuard/GlobalConfig exclude it on
          // purpose: insurance/billing is front-desk work here, not clinical) — explain, don't alarm.
          this.coveragesPermissionDenied.set(true);
          this.coveragesError.set(
            'No tienes permisos para ver ni gestionar la cobertura de seguro de este paciente. La gestión de aseguradoras y pólizas es responsabilidad del personal de recepción/facturación (rol Empleado o Administrador); el rol Doctor no tiene acceso a esta información por diseño.',
          );
        } else {
          this.coveragesError.set(message);
        }
        this.coveragesLoading.set(false);
      },
    });
  }

  private loadCoveragePlansCatalog(): void {
    this.coveragePlansCatalogLoading.set(true);
    this.coveragePlansCatalogError.set(null);
    fetchAllPages((page) => this.coveragePlanApi.getAll(page, 100)).subscribe({
      next: ({ items, complete }) => {
        this.coveragePlansCatalog.set(items);
        this.coveragePlansCatalogIncomplete.set(!complete);
        this.coveragePlansCatalogLoading.set(false);
      },
      error: () => {
        this.coveragePlansCatalogError.set('No se pudieron cargar los planes de cobertura disponibles.');
        this.coveragePlansCatalogLoading.set(false);
      },
    });
  }

  openAssignCoverageModal(): void {
    this.editingCoverage.set(null);
    this.coverageFormPlanId.set(null);
    this.coverageFormPolicyNumber.set('');
    this.coverageFormValidFrom.set('');
    this.coverageFormValidUntil.set('');
    this.coverageFormActive.set(true);
    this.coverageFormError.set(null);
    this.coverageSubmitAttempted.set(false);
    this.isCoverageModalOpen.set(true);
  }

  openEditCoverageModal(item: PatientCoverage): void {
    this.editingCoverage.set(item);
    this.coverageFormPlanId.set(item.plan.id);
    this.coverageFormPolicyNumber.set(item.policyNumber);
    this.coverageFormValidFrom.set(item.validFrom);
    this.coverageFormValidUntil.set(item.validUntil ?? '');
    this.coverageFormActive.set(item.active);
    this.coverageFormError.set(null);
    this.coverageSubmitAttempted.set(false);
    this.isCoverageModalOpen.set(true);
  }

  closeCoverageModal(): void {
    this.isCoverageModalOpen.set(false);
    this.editingCoverage.set(null);
  }

  onCoveragePlanChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.coverageFormPlanId.set(value ? Number(value) : null);
  }

  onCoveragePolicyNumberInput(event: Event): void {
    this.coverageFormPolicyNumber.set((event.target as HTMLInputElement).value);
  }

  onCoverageValidFromInput(event: Event): void {
    this.coverageFormValidFrom.set((event.target as HTMLInputElement).value);
  }

  onCoverageValidUntilInput(event: Event): void {
    this.coverageFormValidUntil.set((event.target as HTMLInputElement).value);
  }

  onCoverageActiveChange(event: Event): void {
    this.coverageFormActive.set((event.target as HTMLInputElement).checked);
  }

  onCoverageFormSubmit(): void {
    this.coverageSubmitAttempted.set(true);
    if (!this.coverageFormValid()) {
      return;
    }

    const planId = this.coverageFormPlanId();
    if (planId == null) return;

    const editing = this.editingCoverage();
    const willBeActive = this.coverageFormActive();
    // Snapshot BEFORE saving: which record this save will silently deactivate,
    // per PatientCoverageService's "at most one active per patient" rule. The
    // save response never names it, so the confirmation shown below is built
    // from the list state already held here, not from the backend response.
    const previousActive = willBeActive ? (this.coverages().find((c) => c.active && c.id !== editing?.id) ?? null) : null;

    const payload = {
      patient: { uuid: this.patientId },
      plan: { id: planId },
      policyNumber: this.coverageFormPolicyNumber().trim(),
      validFrom: this.coverageFormValidFrom(),
      validUntil: this.coverageFormValidUntil() || null,
      active: willBeActive,
    };

    this.coverageFormLoading.set(true);
    this.coverageFormError.set(null);

    const request = editing ? this.patientCoverageApi.update(editing.id, payload) : this.patientCoverageApi.create(payload);

    request.subscribe({
      next: (saved) => {
        this.coverageFormLoading.set(false);
        this.closeCoverageModal();
        this.loadCoverages();

        if (saved.active && previousActive) {
          this.actionMessage.set({
            type: 'success',
            text: `Cobertura (póliza ${saved.policyNumber}) activada. La cobertura anterior (póliza ${previousActive.policyNumber}) fue desactivada automáticamente: el sistema solo permite una cobertura activa por paciente.`,
          });
        } else if (saved.active) {
          this.actionMessage.set({ type: 'success', text: `Cobertura (póliza ${saved.policyNumber}) activada correctamente.` });
        } else {
          this.actionMessage.set({ type: 'success', text: `Cobertura (póliza ${saved.policyNumber}) guardada correctamente.` });
        }
      },
      error: (err) => {
        this.coverageFormLoading.set(false);
        this.coverageFormError.set(
          extractApiErrorMessage(err, editing ? 'Ocurrió un error al actualizar la cobertura.' : 'Ocurrió un error al asignar la cobertura.'),
        );
      },
    });
  }

  onDeleteCoverage(item: PatientCoverage): void {
    if (!confirm(`¿Deseas eliminar la cobertura (póliza ${item.policyNumber})? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.patientCoverageApi.delete(item.id).subscribe({
      next: () => {
        this.actionMessage.set({ type: 'success', text: `Cobertura (póliza ${item.policyNumber}) eliminada.` });
        this.loadCoverages();
      },
      error: (err) => {
        this.actionMessage.set({ type: 'error', text: extractApiErrorMessage(err, 'Error al eliminar la cobertura.') });
      },
    });
  }

  // --- Utilidades de Estado y Badges ---

  getStatusBadgeClass(status: TurnStatus | string): string {
    switch (status) {
      case 'TURN_PENDING':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'TURN_WAITNG':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'TURN_IN_TREATMENT':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'TURN_TREATED':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'TURN_CANCELLED':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  }

  getStatusLabel(status: TurnStatus | string): string {
    switch (status) {
      case 'TURN_PENDING':
        return 'Pendiente';
      case 'TURN_WAITNG':
        return 'En Espera';
      case 'TURN_IN_TREATMENT':
        return 'En Atención';
      case 'TURN_TREATED':
        return 'Atendido';
      case 'TURN_CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  }

  getScheduleStatusBadgeClass(status?: string): string {
    switch (status) {
      case 'STATUS_FREE':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'STATUS_OCCUPIED':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'STATUS_UNAVAILABLE':
        return 'bg-slate-100 text-slate-600 border border-slate-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
  }

  getScheduleStatusLabel(status?: string): string {
    switch (status) {
      case 'STATUS_FREE':
        return 'Disponible';
      case 'STATUS_OCCUPIED':
        return 'Ocupado';
      case 'STATUS_UNAVAILABLE':
        return 'No disponible';
      default:
        return 'Disponible';
    }
  }
}
