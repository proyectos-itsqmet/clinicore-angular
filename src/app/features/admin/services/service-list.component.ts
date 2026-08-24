import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ServicioApiService } from '../../../core/api/servicio-api.service';
import type { Servicio } from '../../../core/models';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { ConfirmDialog } from '../../../shared/ui/molecules/confirm-dialog/confirm-dialog';
import { DataTable, type TableColumn } from '../../../shared/ui/molecules/data-table/data-table';
import { ErrorState } from '../../../shared/ui/molecules/error-state/error-state';
import { InlineAlert } from '../../../shared/ui/molecules/inline-alert/inline-alert';
import { InputField } from '../../../shared/ui/molecules/input-field/input-field';
import { Modal } from '../../../shared/ui/molecules/modal/modal';
import { PageHeader } from '../../../shared/ui/molecules/page-header/page-header';
import { Pagination } from '../../../shared/ui/molecules/pagination/pagination';
import { createAdminListStore } from '../admin-list-store';

type ServiceDialog = 'form' | 'delete';

const COLUMNS: readonly TableColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Servicio', emphasis: true, wrap: true },
  { key: 'price', label: 'Precio', align: 'end' },
  { key: 'discount', label: 'Descuento', align: 'end' },
  { key: 'actions', label: 'Acciones', align: 'end', hiddenLabel: true },
];

/**
 * app-service-list — the services section: paginated table, create/edit
 * dialog and delete confirmation.
 *
 * Same shape as `app-establishment-list`; read that component's doc for the
 * dialog and failure-channel decisions. Two notes specific to this screen:
 *
 * THE ENTITY IS A SERVICE, NOT A SPECIALTY. The route segment is
 * `/administracion/especialidades` and the file names follow it, but
 * `admin-nav.data.ts` labels the destination "Servicios", the endpoint is
 * `/api/services`, and the model is `Servicio` with a price and a discount. The
 * copy on this page says service everywhere, because that is what the rows are;
 * the filenames are left alone so the URL and the menu entry stay put. Renaming
 * the folder is a separate, deliberate change.
 *
 * MONEY GOES THROUGH `CurrencyPipe`, never string concatenation. `app.config.ts`
 * registers `es-EC` precisely so it can. `'symbol'` and two decimals here rather
 * than the landing's `'code'` / no-decimals: a price list is scanned down a
 * column, where "USD 12" is noise and cents are the thing being compared.
 */
@Component({
  selector: 'app-service-list',
  imports: [
    Button,
    ConfirmDialog,
    CurrencyPipe,
    DataTable,
    ErrorState,
    Icon,
    InlineAlert,
    InputField,
    Modal,
    PageHeader,
    Pagination,
    ReactiveFormsModule,
  ],
  templateUrl: './service-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ServiceListComponent implements OnInit {
  private readonly api = inject(ServicioApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly columns = COLUMNS;
  protected readonly rowKey = (row: Servicio) => row.id;

  protected readonly messages = {
    name: { required: 'El nombre es obligatorio.' },
    price: { required: 'El precio es obligatorio.', min: 'El precio no puede ser negativo.' },
    discount: { min: 'El descuento no puede ser negativo.' },
  } as const;

  protected readonly list = createAdminListStore<Servicio>({
    destroyRef: this.destroyRef,
    load: (page) => this.api.getAll(page, 10),
  });

  protected readonly dialog = signal<ServiceDialog | null>(null);
  protected readonly editing = signal<Servicio | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    discount: [0, Validators.min(0)],
  });

  ngOnInit(): void {
    this.list.loadPage(0);
  }
  protected openCreate(): void {
    this.list.resetMessages();
    this.editing.set(null);
    this.form.reset({ name: '', price: 0, discount: 0 });
    this.dialog.set('form');
  }

  protected openEdit(service: Servicio): void {
    this.list.resetMessages();
    this.editing.set(service);
    this.form.reset({ name: service.name, price: service.price, discount: service.discount ?? 0 });
    this.dialog.set('form');
  }

  protected openDelete(service: Servicio): void {
    this.list.resetMessages();
    this.editing.set(service);
    this.dialog.set('delete');
  }

  protected closeDialog(): void {
    if (!this.list.pending()) {
      this.dialog.set(null);
    }
  }

  protected submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    const current = this.editing();

    this.list.run({
      request$: current ? this.api.update(current.id, payload) : this.api.create(payload),
      success: current ? 'Servicio actualizado.' : 'Servicio creado.',
      failure: 'No pudimos guardar el servicio. Intenta nuevamente.',
      onSuccess: () => this.dialog.set(null),
    });
  }

  protected confirmDelete(): void {
    const current = this.editing();
    if (!current) {
      return;
    }

    this.list.run({
      request$: this.api.delete(current.id),
      success: 'Servicio eliminado.',
      failure: 'No pudimos eliminar el servicio. Intenta nuevamente.',
      reloadPage: this.list.pageAfterDelete(),
      onSuccess: () => this.dialog.set(null),
    });
  }
}
