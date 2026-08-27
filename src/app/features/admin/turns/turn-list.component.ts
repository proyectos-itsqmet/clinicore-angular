import { ChangeDetectionStrategy, Component, computed, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { SelectField, type SelectOption } from '../../../shared/ui/molecules/select-field/select-field';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Subscription } from 'rxjs';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { TurnApiService } from '../../../core/api/turn-api.service';
import { ScheduleApiService } from '../../../core/api/schedule-api.service';
import { fetchAllPages } from '../../../core/api/fetch-all-pages.util';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { ConsultorioApiService } from '../../../core/api/consultorio-api.service';
import type { Consultorio, Establishment, Servicio, Turn, Page, ScheduleDTO, TurnStatus } from '../../../core/models';
import { AuthService } from '../../../core/auth/auth.service';

import { ActivatedRoute, RouterLink } from '@angular/router';

export interface TurnBoardDTO {
  id: number;
  order: number;
  status: string;
  hour: string;
  serviceName: string;
  doctorName: string;
  stablishmentName: string;
}

/**
 * Backend broadcast destination for a stablishment's turn board on a given
 * date (`TurnService#broadcastTurnUpdate` in Backend_QMS). Exported as a
 * pure function so both the component and its tests build the exact same
 * string independently of each other.
 */
/**
 * LOCAL `yyyy-MM-dd`. Never `toISOString().split('T')[0]`.
 *
 * FIXED 2026-08-25. Both callers used `toISOString`, which is UTC. This
 * clinic runs at UTC-5, so from 19:00 local onwards `toISOString` already
 * reports TOMORROW: the board defaulted to the wrong day every evening, the
 * "Hoy" preset produced tomorrow, and the STOMP subscription pointed at a
 * topic nothing would ever publish to. No error, no log — the screen simply
 * stopped updating during the busiest hours.
 *
 * The backend builds that path segment from a `LocalDate`, which is the
 * clinic’s calendar day, so the client has to speak the same calendar.
 */
export function localIsoDate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function buildStablishmentTopic(stablishmentId: number, date: string): string {
  return `/topic/stablishment/${stablishmentId}/${date}`;
}

@Component({
  selector: 'app-turn-list',
  imports: [CommonModule, FormsModule, DecimalPipe, RouterLink, SelectField],
  templateUrl: './turn-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnListComponent implements OnInit, OnDestroy {
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly turnApi = inject(TurnApiService);
  private readonly scheduleApi = inject(ScheduleApiService);
  private readonly realtime = inject(RealtimeService);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  /** Small "live vs. stale" indicator — see `RealtimeService` for the state machine. */
  protected readonly connectionStatus = this.realtime.status;

  private realtimeSubscription: Subscription | null = null;
  private feedbackTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // 0. Modo Pizarra en Vivo
  protected readonly isLiveMode = signal<boolean>(false);
  protected readonly liveTurns = signal<TurnBoardDTO[]>([]);
  protected readonly liveLoading = signal<boolean>(false);

  // 1. Establecimientos (catálogo completo: ver `loadEstablishments` — antes
  // se pedía una única página fija de 100 y las sedes siguientes quedaban
  // fuera de esta grilla de selección sin ningún aviso).
  protected readonly establishments = signal<Establishment[]>([]);
  protected readonly establishmentsLoading = signal<boolean>(true);
  protected readonly establishmentsError = signal<string | null>(null);
  protected readonly establishmentsIncomplete = signal<boolean>(false);
  protected readonly selectedEstablishment = signal<Establishment | null>(null);

  // 2. Fecha de Consulta
  protected readonly selectedDate = signal<string>(localIsoDate());

  // 3. Servicios del Establecimiento Seleccionado (paginado + búsqueda: antes
  // `getServices(id, 0, 100)` truncaba en el registro 100 sin aviso).
  protected readonly services = signal<Page<Servicio> | null>(null);
  protected readonly servicesLoading = signal<boolean>(false);
  protected readonly servicesError = signal<string | null>(null);
  protected readonly servicesFilterName = signal<string>('');

  // 4. Modal de Turnos por Servicio
  protected readonly isTurnModalOpen = signal<boolean>(false);
  protected readonly selectedService = signal<Servicio | null>(null);
  protected readonly turnsData = signal<Page<Turn> | null>(null);
  protected readonly turnsLoading = signal<boolean>(false);
  protected readonly turnsError = signal<string | null>(null);
  protected readonly statusFilter = signal<string>('');

  // 5. Modal de Reasignar Turno
  protected readonly isReassignModalOpen = signal<boolean>(false);
  protected readonly turnToReassign = signal<Turn | null>(null);
  protected readonly reassignDate = signal<string>('');
  protected readonly reassignSchedules = signal<Page<ScheduleDTO> | null>(null);
  protected readonly reassignLoading = signal<boolean>(false);
  protected readonly reassignError = signal<string | null>(null);
  protected readonly selectedNewSchedule = signal<ScheduleDTO | null>(null);
  protected readonly reassigning = signal<boolean>(false);

  // 6. Modal de Cancelar Turno por Personal
  protected readonly isCancelModalOpen = signal<boolean>(false);
  protected readonly turnToCancel = signal<Turn | null>(null);
  protected readonly cancelReason = signal<string>('');
  protected readonly cancelling = signal<boolean>(false);

  // 7. Modal de Confirmación: Marcar como Atendido (reemplaza confirm() nativo)
  // --- Llamado con consultorio ---------------------------------------------
  private readonly consultorioApi = inject(ConsultorioApiService);
  protected readonly isCallModalOpen = signal<boolean>(false);
  protected readonly turnToCall = signal<Turn | null>(null);
  protected readonly callRooms = signal<Consultorio[]>([]);

  protected readonly TURN_STATUS_FILTER_OPTIONS: readonly SelectOption[] = [
    { value: '', label: 'Todos los Estados' },
    { value: 'TURN_PENDING', label: 'Pendiente' },
    { value: 'TURN_WAITNG', label: 'En Espera' },
    { value: 'TURN_IN_TREATMENT', label: 'En Atención' },
    { value: 'TURN_TREATED', label: 'Atendido' },
    { value: 'TURN_CANCELLED', label: 'Cancelado' },
  ];

  /**
   * Los consultorios activos de la sede, para el modal de llamado.
   *
   * "Usar el del horario" queda como placeholder y no como opción de la
   * lista: no elegir consultorio no es una tercera alternativa, es dejar el
   * que un administrador ya asignó a esa jornada.
   */
  protected readonly callRoomOptions = computed<readonly SelectOption[]>(() =>
    this.callRooms().map((room) => ({ value: String(room.id), label: room.label })),
  );
  protected readonly callRoomId = signal<number | null>(null);
  protected readonly callSubmitting = signal<boolean>(false);

  protected readonly isMarkTreatedModalOpen = signal<boolean>(false);
  protected readonly turnToMarkTreated = signal<Turn | null>(null);
  protected readonly markingTreated = signal<boolean>(false);

  // Notificación de acción
  protected readonly actionFeedback = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.isLiveMode.set(params['mode'] === 'live');
    });
    this.loadEstablishments();
  }

  loadEstablishments(): void {
    this.establishmentsLoading.set(true);
    this.establishmentsError.set(null);
    fetchAllPages((page) => this.establishmentApi.getAll(page, 100)).subscribe({
      next: ({ items, complete }) => {
        this.establishments.set(items);
        this.establishmentsIncomplete.set(!complete);
        this.establishmentsLoading.set(false);
        if (items.length > 0) {
          this.selectEstablishment(items[0]);
        }
      },
      error: () => {
        this.establishmentsError.set('No se pudieron cargar los establecimientos disponibles.');
        this.establishmentsLoading.set(false);
      }
    });
  }

  selectEstablishment(est: Establishment): void {
    this.selectedEstablishment.set(est);
    this.servicesFilterName.set('');
    this.loadServicesForEstablishment(est.id, 0);
    this.subscribeToRealtime();
    if (this.isLiveMode()) {
      this.loadLiveTurns();
    }
  }

  loadServicesForEstablishment(establishmentId: number, page: number = 0): void {
    this.servicesLoading.set(true);
    this.servicesError.set(null);
    const name = this.servicesFilterName().trim() || undefined;
    this.establishmentApi.getServices(establishmentId, page, 12, name).subscribe({
      next: (pageData) => {
        this.services.set(pageData);
        this.servicesLoading.set(false);
      },
      error: () => {
        this.servicesError.set('No se pudieron cargar los servicios disponibles para este establecimiento.');
        this.servicesLoading.set(false);
      }
    });
  }

  onServicesFilterChange(name: string): void {
    this.servicesFilterName.set(name);
    const est = this.selectedEstablishment();
    if (est) {
      this.loadServicesForEstablishment(est.id, 0);
    }
  }

  onDateChange(newDate: string): void {
    this.selectedDate.set(newDate);
    // Si el modal de turnos está abierto, refrescarlo con la nueva fecha
    if (this.isTurnModalOpen() && this.selectedService()) {
      this.loadTurnsForService(0);
    }
    this.subscribeToRealtime();
    if (this.isLiveMode()) {
      this.loadLiveTurns();
    }
  }

  exitLiveMode(): void {
    window.history.replaceState({}, '', '/admin/turnos');
    this.isLiveMode.set(false);
  }

  loadLiveTurns(): void {
    const est = this.selectedEstablishment();
    if (!est) return;

    this.liveLoading.set(true);
    // Carga inicial masiva de todos los turnos del día
    this.turnApi.getAll({
      stablishmentId: est.id,
      date: this.selectedDate(),
      size: 500, // asume que son menos de 500 al día o traer paginados, acá traemos hasta 500
      sort: 'schedule.hour,asc'
    }).subscribe({
      next: (pageData) => {
        const boardTurns: TurnBoardDTO[] = pageData.content.map(turn => ({
          id: turn.id,
          order: turn.order,
          status: turn.status,
          hour: turn.schedule?.hour || '',
          serviceName: turn.schedule?.service?.name || '',
          doctorName: turn.schedule?.doctor ? `${turn.schedule.doctor.firstName} ${turn.schedule.doctor.lastName}` : '',
          stablishmentName: est.name
        }));
        this.liveTurns.set(boardTurns);
        this.liveLoading.set(false);
      },
      error: () => {
        this.liveLoading.set(false);
      }
    });
  }

  /**
   * (Re)subscribes to the realtime topic for the currently selected
   * stablishment + date, tearing down any previous subscription first.
   */
  private subscribeToRealtime(): void {
    this.realtimeSubscription?.unsubscribe();
    this.realtimeSubscription = null;

    const est = this.selectedEstablishment();
    if (!est) {
      return;
    }

    const topic = buildStablishmentTopic(est.id, this.selectedDate());
    this.realtimeSubscription = this.realtime.subscribeTopic(topic).subscribe((msg) => {
      // Modo Gestión de Turnos normal
      this.loadTurnsForService(this.turnsData()?.number ?? 0);
      
      // Modo Pizarra
      if (this.isLiveMode() && msg.body) {
        try {
          const payload = JSON.parse(msg.body) as TurnBoardDTO;
          this.liveTurns.update(current => {
            const index = current.findIndex(t => t.id === payload.id);
            if (index >= 0) {
              const updated = [...current];
              updated[index] = payload;
              return updated;
            } else {
              // Insert in correct position based on hour (roughly)
              return [...current, payload].sort((a, b) => a.hour.localeCompare(b.hour));
            }
          });
        } catch (e) {
          console.error("Error parsing TurnBoardDTO", e);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.realtimeSubscription?.unsubscribe();
    this.realtimeSubscription = null;
    if (this.feedbackTimeoutId !== null) {
      clearTimeout(this.feedbackTimeoutId);
      this.feedbackTimeoutId = null;
    }
  }

  setDatePreset(preset: 'today' | 'tomorrow'): void {
    const d = new Date();
    if (preset === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    }
    const isoDate = localIsoDate(d);
    this.onDateChange(isoDate);
  }

  // --- Modal de Turnos ---

  openTurnModal(srv: Servicio): void {
    this.selectedService.set(srv);
    this.statusFilter.set('');
    this.isTurnModalOpen.set(true);
    this.loadTurnsForService(0);
  }

  closeTurnModal(): void {
    this.isTurnModalOpen.set(false);
    this.selectedService.set(null);
    this.turnsData.set(null);
  }

  loadTurnsForService(page: number = 0): void {
    const est = this.selectedEstablishment();
    const srv = this.selectedService();
    if (!est || !srv) return;

    this.turnsLoading.set(true);
    this.turnsError.set(null);

    this.turnApi.getAll({
      stablishmentId: est.id,
      serviceId: srv.id,
      date: this.selectedDate(),
      status: (this.statusFilter() as TurnStatus) || undefined,
      page,
      size: 15,
      sort: 'schedule.hour,asc'
    }).subscribe({
      next: (pageData) => {
        this.turnsData.set(pageData);
        this.turnsLoading.set(false);
      },
      error: () => {
        this.turnsError.set('Error al cargar la lista de turnos para este servicio.');
        this.turnsLoading.set(false);
      }
    });
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter.set(status);
    this.loadTurnsForService(0);
  }

  // --- Acciones de Turnos: Registrar Ingreso (Check-in, PENDING -> WAITNG) ---
  /** Solo el backend conoce la transición completa; esto solo refleja su única fuente legal. */
  canMarkWaiting(turn: Turn): boolean {
    return turn.status === 'TURN_PENDING';
  }

  markTurnWaiting(turn: Turn): void {
    this.turnApi.markAsWaiting(turn.id).subscribe({
      next: () => {
        this.showFeedback('success', `El turno #${turn.order} registró su ingreso (En Espera).`);
        this.loadTurnsForService(this.turnsData()?.number ?? 0);
      },
      error: (err) => {
        const msg = err?.error?.error || err?.error?.message || 'Error al registrar el ingreso del turno.';
        this.showFeedback('error', msg);
      }
    });
  }

  // --- Acciones de Turnos: Iniciar Atención (WAITNG -> IN_TREATMENT) ---
  canMarkInTreatment(turn: Turn): boolean {
    return turn.status === 'TURN_WAITNG';
  }

  /**
   * Opens the call dialog instead of firing straight away.
   *
   * The room is prefilled from the shift an admin configured, so the common
   * case is one click. The operator only intervenes on the days a doctor is
   * sitting somewhere else — which is exactly why an empty required field
   * here would be wrong: rushed, forty times a day, it would get skipped or
   * mis-picked, and the patient walks to the wrong door.
   */
  protected openCallModal(turn: Turn): void {
    this.turnToCall.set(turn);
    this.callRoomId.set(null);
    this.callRooms.set([]);
    this.isCallModalOpen.set(true);

    const est = this.selectedEstablishment();
    if (!est) {
      return;
    }

    this.consultorioApi.getByEstablishment(est.id).subscribe({
      // Only ACTIVE rooms: a deactivated one is still referenced by past
      // turns and must keep resolving, but nobody should be sent there now.
      next: (rooms) => this.callRooms.set(rooms.filter((r) => r.active)),
      error: () => this.callRooms.set([]),
    });
  }

  protected closeCallModal(): void {
    this.isCallModalOpen.set(false);
    this.turnToCall.set(null);
    this.callRooms.set([]);
    this.callRoomId.set(null);
  }

  protected confirmCall(): void {
    const turn = this.turnToCall();
    if (!turn) {
      return;
    }
    this.callSubmitting.set(true);
    this.markTurnInTreatment(turn, this.callRoomId());
  }

  markTurnInTreatment(turn: Turn, consultorioId: number | null = null): void {
    this.turnApi.markAsInTreatment(turn.id, consultorioId).subscribe({
      next: () => {
        this.callSubmitting.set(false);
        this.closeCallModal();
        this.showFeedback('success', `El turno #${turn.order} inició su atención (En Atención).`);
        this.loadTurnsForService(this.turnsData()?.number ?? 0);
      },
      error: (err) => {
        this.callSubmitting.set(false);
        const msg = err?.error?.error || err?.error?.message || 'Error al iniciar la atención del turno.';
        this.showFeedback('error', msg);
      }
    });
  }

  // --- Acciones de Turnos: Atender (confirmación vía modal, no confirm() nativo) ---
  openMarkTreatedModal(turn: Turn): void {
    this.turnToMarkTreated.set(turn);
    this.isMarkTreatedModalOpen.set(true);
  }

  closeMarkTreatedModal(): void {
    this.isMarkTreatedModalOpen.set(false);
    this.turnToMarkTreated.set(null);
  }

  confirmMarkTreated(): void {
    const turn = this.turnToMarkTreated();
    if (!turn) return;

    this.markingTreated.set(true);
    
    const userRole = this.authService.currentUser()?.role;
    const request = userRole === 'ROLE_ADMIN' 
      ? this.turnApi.markAsTreatedAdmin(turn.id)
      : this.turnApi.markAsTreated(turn.id);

    request.subscribe({
      next: () => {
        this.markingTreated.set(false);
        this.closeMarkTreatedModal();
        this.showFeedback('success', `El turno #${turn.order} ha sido marcado como ATENDIDO.`);
        this.loadTurnsForService(this.turnsData()?.number ?? 0);
      },
      error: (err) => {
        this.markingTreated.set(false);
        const msg = err?.error?.error || err?.error?.message || 'Error al marcar como atendido.';
        this.showFeedback('error', msg);
      }
    });
  }

  // --- Acciones de Turnos: Cancelar ---
  openCancelModal(turn: Turn): void {
    this.turnToCancel.set(turn);
    this.cancelReason.set('');
    this.isCancelModalOpen.set(true);
  }

  closeCancelModal(): void {
    this.isCancelModalOpen.set(false);
    this.turnToCancel.set(null);
  }

  confirmCancel(): void {
    const turn = this.turnToCancel();
    if (!turn) return;

    this.cancelling.set(true);
    this.turnApi.cancelByStaff(turn.id, this.cancelReason().trim() || undefined).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.closeCancelModal();
        this.showFeedback('success', `Turno #${turn.order} cancelado correctamente.`);
        this.loadTurnsForService(this.turnsData()?.number ?? 0);
      },
      error: (err) => {
        this.cancelling.set(false);
        const msg = err?.error?.error || err?.error?.message || 'Error al cancelar turno.';
        this.showFeedback('error', msg);
      }
    });
  }

  // --- Acciones de Turnos: Reasignar ---
  openReassignModal(turn: Turn): void {
    this.turnToReassign.set(turn);
    this.reassignDate.set(this.selectedDate());
    this.selectedNewSchedule.set(null);
    this.isReassignModalOpen.set(true);
    this.loadReassignSchedules(0);
  }

  closeReassignModal(): void {
    this.isReassignModalOpen.set(false);
    this.turnToReassign.set(null);
    this.selectedNewSchedule.set(null);
  }

  loadReassignSchedules(page: number = 0): void {
    const est = this.selectedEstablishment();
    const turn = this.turnToReassign();
    if (!est || !turn) return;

    this.reassignLoading.set(true);
    this.reassignError.set(null);
    this.scheduleApi.getAll({
      stablishmentId: est.id,
      serviceId: turn.schedule?.service?.id,
      date: this.reassignDate() || undefined,
      page,
      size: 8
    }).subscribe({
      next: (data) => {
        this.reassignSchedules.set(data);
        this.reassignLoading.set(false);
      },
      error: () => {
        this.reassignError.set('No se pudieron cargar los horarios disponibles para reasignar.');
        this.reassignLoading.set(false);
      }
    });
  }

  onReassignDateChange(newDate: string): void {
    this.reassignDate.set(newDate);
    this.loadReassignSchedules(0);
  }

  selectScheduleForReassign(sched: ScheduleDTO): void {
    if (sched.status === 'STATUS_OCCUPIED' || sched.status === 'STATUS_UNAVAILABLE') {
      return;
    }
    this.selectedNewSchedule.set(sched);
  }

  confirmReassign(): void {
    const turn = this.turnToReassign();
    const sched = this.selectedNewSchedule();
    if (!turn || !sched || !sched.id) return;

    this.reassigning.set(true);
    this.turnApi.reassign(turn.id, sched.id).subscribe({
      next: () => {
        this.reassigning.set(false);
        this.closeReassignModal();
        this.showFeedback('success', `Turno #${turn.order} reasignado exitosamente al horario ${sched.date} ${sched.hour}.`);
        this.loadTurnsForService(this.turnsData()?.number ?? 0);
      },
      error: (err) => {
        this.reassigning.set(false);
        const msg = err?.error?.error || err?.error?.message || 'Error al reasignar turno.';
        this.showFeedback('error', msg);
      }
    });
  }

  private showFeedback(type: 'success' | 'error', message: string): void {
    if (this.feedbackTimeoutId !== null) {
      clearTimeout(this.feedbackTimeoutId);
    }
    this.actionFeedback.set({ type, message });
    this.feedbackTimeoutId = setTimeout(() => {
      this.actionFeedback.set(null);
      this.feedbackTimeoutId = null;
    }, 4500);
  }

  // --- Helpers de Estado ---
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
}
