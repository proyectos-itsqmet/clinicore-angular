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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { ServicioApiService } from '../../../core/api/servicio-api.service';
import type { Establishment, Servicio } from '../../../core/models';
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
import {
  SelectField,
  type SelectOption,
} from '../../../shared/ui/molecules/select-field/select-field';
import { createAdminListStore } from '../admin-list-store';

/** Only one dialog is ever open, so it is one signal and not three booleans. */
type EstablishmentDialog = 'form' | 'delete' | 'assign';

const COLUMNS: readonly TableColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Nombre', emphasis: true },
  { key: 'address', label: 'Dirección', wrap: true },
  { key: 'actions', label: 'Acciones', align: 'end', hiddenLabel: true },
];

/**
 * app-establishment-list — the sedes section: paginated table, create/edit
 * dialog, delete confirmation, and the dialog that attaches a service to a sede.
 *
 * PRESENTATION IS ENTIRELY BORROWED. Every surface here is a component from
 * `shared/ui` — table, pager, dialogs, fields, buttons. What is left is the only
 * thing a feature should own: which endpoint to call, what to do with the
 * answer, and the copy that names sedes.
 *
 * AND SO IS THE STATE. `AdminListStore` owns the page, the loading flag, the
 * three failure channels and the reload-after-write shape. This section used to
 * carry its own copy of all of it — one of four identical copies across the
 * panel, which is three too many. Read `admin-list-store.ts` for why the
 * failure channels are three and not one; the short version is that a dialog is
 * in the browser's top layer, so an error painted on the page behind it is
 * invisible.
 *
 * ONE SIGNAL FOR THE OPEN DIALOG. Three booleans can all be true at once, and
 * this screen has no rendering for that state; a nullable enum cannot reach it.
 */
@Component({
  selector: 'app-establishment-list',
  imports: [
    Button,
    ConfirmDialog,
    DataTable,
    ErrorState,
    Icon,
    InlineAlert,
    InputField,
    Modal,
    PageHeader,
    Pagination,
    ReactiveFormsModule,
    SelectField,
  ],
  templateUrl: './establishment-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class EstablishmentListComponent implements OnInit {
  private readonly api = inject(EstablishmentApiService);
  private readonly servicioApi = inject(ServicioApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly columns = COLUMNS;
  protected readonly rowKey = (row: Establishment) => row.id;

  /**
   * Hoisted out of the template on purpose. An object literal in a binding is a
   * NEW object on every check, so a signal input never compares equal to its
   * previous value and re-runs everything downstream of it for nothing.
   */
  protected readonly messages = {
    name: { required: 'El nombre es obligatorio.' },
    address: { required: 'La dirección es obligatoria.' },
    service: {
      required: 'Selecciona un servicio de la lista.',
      min: 'Selecciona un servicio de la lista.',
    },
  } as const;

  protected readonly list = createAdminListStore<Establishment>({
    destroyRef: this.destroyRef,
    load: (page) => this.api.getAll(page, 10),
  });

  protected readonly dialog = signal<EstablishmentDialog | null>(null);
  protected readonly editing = signal<Establishment | null>(null);

  private readonly services = signal<readonly Servicio[]>([]);
  protected readonly servicesLoading = signal(false);

  protected readonly serviceOptions = computed<readonly SelectOption[]>(() =>
    this.services().map((service) => ({ value: service.id, label: service.name })),
  );

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    address: ['', Validators.required],
  });

  protected readonly assignForm = this.fb.nonNullable.group({
    serviceId: [0, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.list.loadPage(0);
  }

  protected openCreate(): void {
    this.list.resetMessages();
    this.editing.set(null);
    this.form.reset({ name: '', address: '' });
    this.dialog.set('form');
  }

  protected openEdit(establishment: Establishment): void {
    this.list.resetMessages();
    this.editing.set(establishment);
    this.form.reset({ name: establishment.name, address: establishment.address });
    this.dialog.set('form');
  }

  protected openDelete(establishment: Establishment): void {
    this.list.resetMessages();
    this.editing.set(establishment);
    this.dialog.set('delete');
  }

  protected openAssign(establishment: Establishment): void {
    this.list.resetMessages();
    this.editing.set(establishment);
    this.assignForm.reset({ serviceId: 0 });
    this.dialog.set('assign');
    this.loadServices();
  }

  protected closeDialog(): void {
    // Ignored mid-request: the dialog is the only thing on screen telling the
    // user that something is still happening.
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
      success: current ? 'Establecimiento actualizado.' : 'Establecimiento creado.',
      failure: 'No pudimos guardar el establecimiento. Intenta nuevamente.',
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
      success: 'Establecimiento eliminado.',
      failure: 'No pudimos eliminar el establecimiento. Intenta nuevamente.',
      reloadPage: this.list.pageAfterDelete(),
      onSuccess: () => this.dialog.set(null),
    });
  }

  protected submitAssign(): void {
    if (this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }

    const current = this.editing();
    if (!current) {
      return;
    }

    // A `<select>` hands back a STRING even when the option's value was bound as
    // a number, so the id is coerced at the call boundary instead of trusting
    // the control's declared type.
    const serviceId = Number(this.assignForm.getRawValue().serviceId);

    this.list.run({
      request$: this.api.assignService(current.id, serviceId),
      success: 'Servicio asignado al establecimiento.',
      failure: 'No pudimos asignar el servicio. Intenta nuevamente.',
      onSuccess: () => this.dialog.set(null),
    });
  }

  private loadServices(): void {
    if (this.services().length > 0) {
      return;
    }

    this.servicesLoading.set(true);
    this.servicioApi
      .getAll(0, 100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.services.set(page.content);
          this.servicesLoading.set(false);
        },
        error: () => {
          this.servicesLoading.set(false);
          // Va al canal del DIÁLOGO porque el desplegable que falló está dentro
          // del diálogo abierto, no en la página.
          this.list.dialogError.set('No pudimos cargar la lista de servicios.');
        },
      });
  }
}
