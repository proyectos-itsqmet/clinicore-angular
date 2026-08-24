import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { BlockReasonApiService } from '../../../core/api/block-reason-api.service';
import type { BlockReason, BlockReasonKind } from '../../../core/models';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Pill } from '../../../shared/ui/atoms/pill/pill';
import { DataTable, type TableColumn } from '../../../shared/ui/molecules/data-table/data-table';
import { ErrorState } from '../../../shared/ui/molecules/error-state/error-state';
import { InlineAlert } from '../../../shared/ui/molecules/inline-alert/inline-alert';
import { InputField } from '../../../shared/ui/molecules/input-field/input-field';
import { Modal } from '../../../shared/ui/molecules/modal/modal';
import { PageHeader } from '../../../shared/ui/molecules/page-header/page-header';
import { Pagination } from '../../../shared/ui/molecules/pagination/pagination';
import {
  SelectField,
  type SelectOption,
} from '../../../shared/ui/molecules/select-field/select-field';
import { createAdminListStore } from '../admin-list-store';

type BlockReasonDialog = 'form';

const COLUMNS: readonly TableColumn[] = [
  { key: 'name', label: 'Motivo', emphasis: true, wrap: true },
  { key: 'kind', label: 'Se usa en' },
  { key: 'state', label: 'Estado' },
  { key: 'actions', label: 'Acciones', align: 'end', hiddenLabel: true },
];

/** Los cuatro valores del enum del backend, con la palabra que lee un humano. */
const KIND_OPTIONS: readonly SelectOption[] = [
  { value: 'REASON_HOLIDAY', label: 'Feriados' },
  { value: 'REASON_VACATION', label: 'Vacaciones' },
  { value: 'REASON_PERMISSION', label: 'Permisos' },
  { value: 'REASON_OTHER', label: 'Otro' },
];

/**
 * app-block-reason-list — Bloqueo de citas → Motivos.
 *
 * NO DICE "ELIMINAR" EN NINGÚN LADO, y eso es deliberado: el backend desactiva
 * en vez de borrar, porque hay ausencias apuntando a estas filas y su motivo
 * tiene que seguir siendo legible. Un botón que dice "Eliminar" y desactiva es
 * una mentira chica que se vuelve grande cuando alguien lo aprieta esperando que
 * la fila desaparezca.
 *
 * Reactivar es la misma pantalla: el formulario tiene el estado como campo.
 */
@Component({
  selector: 'app-block-reason-list',
  imports: [
    Button,
    DataTable,
    ErrorState,
    Icon,
    InlineAlert,
    InputField,
    Modal,
    PageHeader,
    Pagination,
    Pill,
    ReactiveFormsModule,
    SelectField,
  ],
  templateUrl: './block-reason-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class BlockReasonListComponent implements OnInit {
  private readonly api = inject(BlockReasonApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly columns = COLUMNS;
  protected readonly kindOptions = KIND_OPTIONS;
  protected readonly rowKey = (row: BlockReason) => row.id;

  protected readonly messages = {
    name: { required: 'El nombre es obligatorio.' },
    kind: { required: 'Elige en qué pantalla se usa este motivo.' },
  } as const;

  protected readonly list = createAdminListStore<BlockReason>({
    destroyRef: this.destroyRef,
    load: (page) => this.api.getAll(page, 10),
  });

  protected readonly dialog = signal<BlockReasonDialog | null>(null);
  protected readonly editing = signal<BlockReason | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    kind: ['REASON_OTHER', Validators.required],
    active: [true],
  });

  ngOnInit(): void {
    this.list.loadPage(0);
  }

  protected kindLabel(kind: BlockReasonKind): string {
    return KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind;
  }

  protected openCreate(): void {
    this.list.resetMessages();
    this.editing.set(null);
    this.form.reset({ name: '', kind: 'REASON_OTHER', active: true });
    this.dialog.set('form');
  }

  protected openEdit(reason: BlockReason): void {
    this.list.resetMessages();
    this.editing.set(reason);
    this.form.reset({ name: reason.name, kind: reason.kind, active: reason.active });
    this.dialog.set('form');
  }

  protected closeDialog(): void {
    if (!this.list.pending()) {
      this.dialog.set(null);
    }
  }

  protected toggleActive(reason: BlockReason): void {
    this.list.resetMessages();
    this.list.run({
      request$: this.api.update(reason.id, {
        name: reason.name,
        kind: reason.kind,
        active: !reason.active,
      }),
      success: reason.active ? 'Motivo desactivado.' : 'Motivo reactivado.',
      failure: 'No pudimos cambiar el estado del motivo.',
      // Desde una fila, no desde un dialogo: el error va a la pagina.
      errorChannel: 'page',
    });
  }

  protected submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name,
      kind: raw.kind as BlockReasonKind,
      active: raw.active,
    };
    const current = this.editing();

    this.list.run({
      request$: current ? this.api.update(current.id, payload) : this.api.create(payload),
      success: current ? 'Motivo actualizado.' : 'Motivo creado.',
      failure: 'No pudimos guardar el motivo. Intenta nuevamente.',
      onSuccess: () => this.dialog.set(null),
    });
  }
}
