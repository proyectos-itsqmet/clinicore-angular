import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import { TurnApiService } from '../../../core/api/turn-api.service';
import type { Turn } from '../../../core/models';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Pill } from '../../../shared/ui/atoms/pill/pill';
import { ConfirmDialog } from '../../../shared/ui/molecules/confirm-dialog/confirm-dialog';
import { DataTable, type TableColumn } from '../../../shared/ui/molecules/data-table/data-table';
import { ErrorState } from '../../../shared/ui/molecules/error-state/error-state';
import { InlineAlert } from '../../../shared/ui/molecules/inline-alert/inline-alert';
import { PageHeader } from '../../../shared/ui/molecules/page-header/page-header';
import { Pagination } from '../../../shared/ui/molecules/pagination/pagination';
import { createAdminListStore } from '../admin-list-store';
import { isTurnClosed, turnStatusLabel, turnStatusTone } from './turn-status';

const COLUMNS: readonly TableColumn[] = [
  { key: 'order', label: 'Turno', emphasis: true },
  { key: 'patient', label: 'Paciente' },
  { key: 'service', label: 'Servicio', wrap: true },
  { key: 'when', label: 'Fecha y hora' },
  { key: 'stablishment', label: 'Sede' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: 'Acciones', align: 'end', hiddenLabel: true },
];

/**
 * app-turn-list — Turnos.
 *
 * DOS TRANSICIONES, NO UN CRUD. Un turno no se edita ni se borra desde acá: se
 * marca atendido o se cancela, que es lo que el backend expone (`PUT
 * /{id}/treated` y `/{id}/cancelled`). Crear turnos desde el mostrador existe
 * como endpoint (`POST /api/turns/staff`) pero necesita elegir un cupo de agenda
 * concreto, y eso es la pantalla de Calendario — meterlo acá sería un
 * formulario que duplica un buscador que ya existe al lado.
 *
 * CANCELAR PIDE CONFIRMACIÓN Y ATENDER NO. No es inconsistencia: las dos son
 * irreversibles para el backend, pero marcar atendido es la acción esperada al
 * final de cada turno — pedir confirmación cincuenta veces por día entrena a
 * confirmar sin leer, que es justamente lo que hace peligrosa a la confirmación
 * de cancelar.
 *
 * EL BOTÓN DESHABILITADO NO ALCANZA. Un turno cerrado no admite transiciones y
 * los botones se apagan, pero dos operadores en dos pestañas pueden cerrar el
 * mismo turno: el 400 del backend se muestra en `pageError` y la tabla se
 * recarga igual.
 */
@Component({
  selector: 'app-turn-list',
  imports: [
    Button,
    ConfirmDialog,
    DataTable,
    DatePipe,
    ErrorState,
    Icon,
    InlineAlert,
    PageHeader,
    Pagination,
    Pill,
  ],
  templateUrl: './turn-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class TurnListComponent implements OnInit {
  private readonly api = inject(TurnApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly columns = COLUMNS;
  protected readonly rowKey = (row: Turn) => row.id;
  protected readonly statusLabel = turnStatusLabel;
  protected readonly statusTone = turnStatusTone;
  protected readonly isClosed = isTurnClosed;

  protected readonly list = createAdminListStore<Turn>({
    destroyRef: this.destroyRef,
    load: (page) => this.api.getAll(page, 10),
  });

  protected readonly cancelling = signal<Turn | null>(null);

  ngOnInit(): void {
    this.list.loadPage(0);
  }

  protected patientName(turn: Turn): string {
    const patient = turn.patient;
    return patient?.firstName ? `${patient.firstName} ${patient.lastName ?? ''}`.trim() : '—';
  }

  protected markTreated(turn: Turn): void {
    this.list.resetMessages();
    this.list.run({
      request$: this.api.markAsTreated(turn.id),
      success: `Turno ${turn.order} marcado como atendido.`,
      failure: 'No pudimos marcar el turno como atendido. Puede que ya esté cerrado.',
      errorChannel: 'page',
    });
  }

  protected openCancel(turn: Turn): void {
    this.list.resetMessages();
    this.cancelling.set(turn);
  }

  protected closeCancel(): void {
    if (!this.list.pending()) {
      this.cancelling.set(null);
    }
  }

  protected confirmCancel(): void {
    const turn = this.cancelling();
    if (!turn) {
      return;
    }

    this.list.run({
      request$: this.api.cancel(turn.id),
      success: `Turno ${turn.order} cancelado.`,
      failure: 'No pudimos cancelar el turno. Puede que ya esté atendido o cancelado.',
      onSuccess: () => this.cancelling.set(null),
    });
  }
}
