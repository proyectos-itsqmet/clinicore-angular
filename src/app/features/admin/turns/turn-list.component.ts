import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { TurnApiService } from '../../../core/api/turn-api.service';
import { ScheduleApiService } from '../../../core/api/schedule-api.service';
import type { Establishment, Servicio, Turn, Page, ScheduleDTO, TurnStatus } from '../../../core/models';

@Component({
  selector: 'app-turn-list',
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './turn-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnListComponent implements OnInit {
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly turnApi = inject(TurnApiService);
  private readonly scheduleApi = inject(ScheduleApiService);

  // 1. Establecimientos
  protected readonly establishments = signal<Establishment[]>([]);
  protected readonly establishmentsLoading = signal<boolean>(true);
  protected readonly selectedEstablishment = signal<Establishment | null>(null);

  // 2. Fecha de Consulta
  protected readonly selectedDate = signal<string>(new Date().toISOString().split('T')[0]);

  // 3. Servicios del Establecimiento Seleccionado
  protected readonly services = signal<Servicio[]>([]);
  protected readonly servicesLoading = signal<boolean>(false);
  protected readonly servicesError = signal<string | null>(null);

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
  protected readonly selectedNewSchedule = signal<ScheduleDTO | null>(null);
  protected readonly reassigning = signal<boolean>(false);

  // 6. Modal de Cancelar Turno por Personal
  protected readonly isCancelModalOpen = signal<boolean>(false);
  protected readonly turnToCancel = signal<Turn | null>(null);
  protected readonly cancelReason = signal<string>('');
  protected readonly cancelling = signal<boolean>(false);

  // Notificación de acción
  protected readonly actionFeedback = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  ngOnInit(): void {
    this.loadEstablishments();
  }

  loadEstablishments(): void {
    this.establishmentsLoading.set(true);
    this.establishmentApi.getAll(0, 100).subscribe({
      next: (page) => {
        const list = page.content ?? [];
        this.establishments.set(list);
        this.establishmentsLoading.set(false);
        if (list.length > 0) {
          this.selectEstablishment(list[0]);
        }
      },
      error: () => {
        this.establishmentsLoading.set(false);
      }
    });
  }

  selectEstablishment(est: Establishment): void {
    this.selectedEstablishment.set(est);
    this.loadServicesForEstablishment(est.id);
  }

  loadServicesForEstablishment(establishmentId: number): void {
    this.servicesLoading.set(true);
    this.servicesError.set(null);
    this.establishmentApi.getServices(establishmentId, 0, 100).subscribe({
      next: (page) => {
        this.services.set(page.content ?? []);
        this.servicesLoading.set(false);
      },
      error: () => {
        this.servicesError.set('No se pudieron cargar los servicios disponibles para este establecimiento.');
        this.servicesLoading.set(false);
      }
    });
  }

  onDateChange(newDate: string): void {
    this.selectedDate.set(newDate);
    // Si el modal de turnos está abierto, refrescarlo con la nueva fecha
    if (this.isTurnModalOpen() && this.selectedService()) {
      this.loadTurnsForService(0);
    }
  }

  setDatePreset(preset: 'today' | 'tomorrow'): void {
    const d = new Date();
    if (preset === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    }
    const isoDate = d.toISOString().split('T')[0];
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

  // --- Acciones de Turnos: Atender ---
  markTurnTreated(turn: Turn): void {
    if (!confirm(`¿Confirmas marcar el turno #${turn.order} como ATENDIDO?`)) {
      return;
    }

    this.turnApi.markAsTreated(turn.id).subscribe({
      next: () => {
        this.showFeedback('success', `El turno #${turn.order} ha sido marcado como ATENDIDO.`);
        this.loadTurnsForService(this.turnsData()?.number ?? 0);
      },
      error: (err) => {
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
    this.actionFeedback.set({ type, message });
    setTimeout(() => {
      this.actionFeedback.set(null);
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
