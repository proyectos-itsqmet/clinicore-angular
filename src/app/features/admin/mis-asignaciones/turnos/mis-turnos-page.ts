import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { tap } from 'rxjs';

import { Icon } from '../../../../shared/ui/atoms/icon/icon';
import { TurnApiService } from '../../../../core/api/turn-api.service';
import { ServicioApiService } from '../../../../core/api/servicio-api.service';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import type { Turn, TurnStatus, Servicio } from '../../../../core/models';

/** Destino WebSocket autenticado del doctor por servicio y fecha. */
export function buildDoctorServiceTopic(serviceId: number, date: string): string {
  return '/user/topic/service/' + serviceId + '/' + date;
}

/** yyyy-MM-dd en hora LOCAL (no UTC). */
function localIsoDate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

export type TurnStatusFilter = TurnStatus | 'ALL';

interface StatusOption {
  value: TurnStatusFilter;
  label: string;
}

@Component({
  selector: 'app-mis-turnos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, Icon],
  templateUrl: './mis-turnos-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisTurnosPage implements OnInit {
  private readonly turnApi = inject(TurnApiService);
  private readonly servicioApi = inject(ServicioApiService);
  private readonly realtime = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly connectionStatus = this.realtime.status;

  protected readonly loading = signal(true);
  protected readonly turnsLoading = signal(false);
  protected readonly services = signal<Servicio[]>([]);
  protected readonly allTurns = signal<Turn[]>([]);
  protected readonly actionLoading = signal<number | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly actionSuccess = signal<string | null>(null);

  protected readonly selectedDate = signal<string>(localIsoDate());
  protected readonly selectedServiceId = signal<number | null>(null);
  protected readonly selectedStatus = signal<TurnStatusFilter>('ALL');

  protected readonly statusOptions: StatusOption[] = [
    { value: 'ALL',               label: 'Todos' },
    { value: 'TURN_PENDING',      label: 'Pendiente' },
    { value: 'TURN_WAITNG',       label: 'En sala de espera' },
    { value: 'TURN_IN_TREATMENT', label: 'En atención' },
    { value: 'TURN_TREATED',      label: 'Atendido' },
    { value: 'TURN_CANCELLED',    label: 'Cancelado' },
  ];

  protected readonly filteredTurns = computed(() => {
    const status = this.selectedStatus();
    const turns = this.allTurns();
    if (status === 'ALL') return turns;
    return turns.filter(t => t.status === status);
  });

  protected readonly counts = computed(() => {
    const all = this.allTurns();
    return {
      pending:     all.filter(t => t.status === 'TURN_PENDING').length,
      waiting:     all.filter(t => t.status === 'TURN_WAITNG').length,
      inTreatment: all.filter(t => t.status === 'TURN_IN_TREATMENT').length,
      treated:     all.filter(t => t.status === 'TURN_TREATED').length,
      cancelled:   all.filter(t => t.status === 'TURN_CANCELLED').length,
    };
  });

  ngOnInit(): void {
    this.loadServices();
  }

  private loadServices(): void {
    this.loading.set(true);
    this.servicioApi.getMyServices().pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (services) => {
        this.services.set(services);
        if (services.length > 0 && this.selectedServiceId() === null) {
          this.selectedServiceId.set(services[0].id);
        }
        this.loading.set(false);
        this.loadTurns();
        this.subscribeToWebSocket();
      },
      error: () => {
        this.services.set([]);
        this.loading.set(false);
      },
    });
  }

  protected loadTurns(): void {
    const serviceId = this.selectedServiceId();
    const date = this.selectedDate();
    this.turnsLoading.set(true);
    this.turnApi.getAll({
      serviceId: serviceId ?? undefined,
      date,
      size: 100,
      sort: 'order,asc',
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (page) => {
        this.allTurns.set(page.content);
        this.turnsLoading.set(false);
      },
      error: () => {
        this.turnsLoading.set(false);
      },
    });
  }

  private subscribeToWebSocket(): void {
    const date = this.selectedDate();
    for (const srv of this.services()) {
      const topic = buildDoctorServiceTopic(srv.id, date);
      this.realtime.subscribeTopic(topic).pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadTurns()),
      ).subscribe();
    }
  }

  protected onServiceChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedServiceId.set(val ? Number(val) : null);
    this.loadTurns();
  }

  protected onDateChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.selectedDate.set(val);
    this.loadTurns();
    this.subscribeToWebSocket();
  }

  protected onStatusChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as TurnStatusFilter;
    this.selectedStatus.set(val);
  }

  protected setToday(): void {
    this.selectedDate.set(localIsoDate());
    this.loadTurns();
    this.subscribeToWebSocket();
  }

  /**
   * Check-in: el paciente llegó y se registró.
   *
   * FALTABA, y era el único paso de la máquina de estados sin botón acá.
   * `markAsInTreatment` exige TURN_WAITNG (`TurnService.java:335`), así que un
   * turno "Pendiente" no tenía forma de avanzar desde esta pantalla: el médico
   * dependía de que recepción lo moviera antes de poder llamarlo. En una
   * consulta donde el paciente ya está en la puerta, eso es una llamada de
   * teléfono para mover un dato que el médico tiene delante.
   */
  markAsWaiting(turn: Turn): void {
    this.executeAction(turn.id, () => this.turnApi.markAsWaiting(turn.id), 'Ingreso registrado');
  }

  markAsInTreatment(turn: Turn): void {
    this.executeAction(turn.id, () => this.turnApi.markAsInTreatment(turn.id), 'Turno marcado como En Atención');
  }

  protected markAsTreated(turn: Turn): void {
    this.executeAction(turn.id, () => this.turnApi.markAsTreated(turn.id), 'Turno marcado como Atendido');
  }

  private executeAction(
    turnId: number,
    action: () => import('rxjs').Observable<Turn>,
    successMsg: string,
  ): void {
    this.actionLoading.set(turnId);
    this.actionError.set(null);
    this.actionSuccess.set(null);
    action().pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.actionSuccess.set(successMsg);
        this.loadTurns();
        setTimeout(() => this.actionSuccess.set(null), 3000);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.actionLoading.set(null);
        this.actionError.set(err?.error?.message ?? err?.message ?? 'Error al actualizar turno');
        setTimeout(() => this.actionError.set(null), 5000);
      },
    });
  }

  protected getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      TURN_PENDING:      'Pendiente',
      TURN_WAITNG:       'En sala de espera',
      TURN_IN_TREATMENT: 'En atención',
      TURN_TREATED:      'Atendido',
      TURN_CANCELLED:    'Cancelado',
    };
    return map[status] ?? status;
  }

  protected getStatusClasses(status: string): string {
    const map: Record<string, string> = {
      TURN_PENDING:      'bg-slate-100 text-slate-700',
      TURN_WAITNG:       'bg-amber-100 text-amber-800',
      TURN_IN_TREATMENT: 'bg-blue-100 text-blue-800',
      TURN_TREATED:      'bg-emerald-100 text-emerald-800',
      TURN_CANCELLED:    'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-slate-100 text-slate-700';
  }

  // Las tres guardas replican EXACTAMENTE las del backend, no una idea propia
  // de lo que debería poder hacerse:
  //   markAsWaiting      exige TURN_PENDING          (TurnService.java:301)
  //   markAsInTreatment  exige TURN_WAITNG           (TurnService.java:335)
  //   markAsTreated      exige TURN_IN_TREATMENT
  // Ofrecer un botón que el servidor va a rechazar convierte una regla clara
  // en un error genérico a mitad de consulta.

  canMarkWaiting(turn: Turn): boolean {
    return turn.status === 'TURN_PENDING';
  }

  canMarkInTreatment(turn: Turn): boolean {
    return turn.status === 'TURN_WAITNG';
  }

  canMarkTreated(turn: Turn): boolean {
    return turn.status === 'TURN_IN_TREATMENT';
  }

  /**
   * El número que el paciente escucha, con el orden como respaldo.
   *
   * `order` solo es el contador interno: se cuenta por servicio y por fecha, así
   * que otro paciente en otro consultorio también es el 3 hoy. El ticket lleva
   * el prefijo del servicio y es el que sale en la pantalla de sala.
   */
  ticketOf(turn: Turn): string {
    return turn.ticket ?? String(turn.order);
  }
}
