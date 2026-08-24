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
import { OperatorApiService } from '../../../core/api/operator-api.service';
import type { Establishment, Operator, OperatorCreate } from '../../../core/models';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Pill } from '../../../shared/ui/atoms/pill/pill';
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

type OperatorDialog = 'form' | 'delete' | 'assign';

const COLUMNS: readonly TableColumn[] = [
  { key: 'name', label: 'Nombre', emphasis: true },
  { key: 'email', label: 'Correo' },
  { key: 'role', label: 'Rol' },
  { key: 'actions', label: 'Acciones', align: 'end', hiddenLabel: true },
];

/** The two roles the endpoint accepts, and the words a human reads for them. */
const ROLE_OPTIONS: readonly SelectOption[] = [
  { value: 'ROLE_EMPLOYEE', label: 'Operador' },
  { value: 'ROLE_ADMIN', label: 'Administrador' },
];

/**
 * app-operator-list — the operators section: paginated table, create/edit
 * dialog, delete confirmation, and the dialog that attaches an operator to a
 * sede.
 *
 * Same shape as `app-establishment-list` — read that component's doc for why
 * the open dialog is one signal and why failures travel on two separate
 * channels. Two things are specific to this screen:
 *
 * THE PASSWORD IS REQUIRED ON CREATE AND OPTIONAL ON EDIT, so its validator is
 * swapped when the dialog opens rather than being declared once. An empty
 * string is then stripped from the payload — sending `password: ""` to the
 * update endpoint would ask it to set an empty password, which is not what an
 * untouched field means.
 *
 * THE ROLE IS RENDERED AS A PILL, not raw. `ROLE_EMPLOYEE` is a wire value; the
 * table shows people, and nobody administering a clinic should have to know the
 * enum. The two tones differ because the two roles differ in what they can do.
 */
@Component({
  selector: 'app-operator-list',
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
    Pill,
    ReactiveFormsModule,
    SelectField,
  ],
  templateUrl: './operator-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class OperatorListComponent implements OnInit {
  private readonly api = inject(OperatorApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly columns = COLUMNS;
  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly rowKey = (row: Operator) => row.uuid;

  protected readonly messages = {
    firstName: { required: 'El nombre es obligatorio.' },
    lastName: { required: 'El apellido es obligatorio.' },
    email: { required: 'El correo es obligatorio.' },
    password: { required: 'La contraseña es obligatoria.' },
    role: { required: 'Selecciona un rol.' },
    establishment: {
      required: 'Selecciona un establecimiento de la lista.',
      min: 'Selecciona un establecimiento de la lista.',
    },
  } as const;

  protected readonly list = createAdminListStore<Operator>({
    destroyRef: this.destroyRef,
    load: (page) => this.api.getAll(page, 10),
  });

  protected readonly dialog = signal<OperatorDialog | null>(null);
  protected readonly editing = signal<Operator | null>(null);

  private readonly establishments = signal<readonly Establishment[]>([]);
  protected readonly establishmentsLoading = signal(false);

  protected readonly establishmentOptions = computed<readonly SelectOption[]>(() =>
    this.establishments().map((item) => ({
      value: item.id,
      label: `${item.name} — ${item.address}`,
    })),
  );

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    role: ['ROLE_EMPLOYEE', Validators.required],
  });

  protected readonly assignForm = this.fb.nonNullable.group({
    stablishmentId: [0, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.list.loadPage(0);
  }

  protected roleLabel(role: string): string {
    return role === 'ROLE_ADMIN' ? 'Administrador' : 'Operador';
  }
  protected openCreate(): void {
    this.list.resetMessages();
    this.editing.set(null);
    this.form.reset({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'ROLE_EMPLOYEE',
    });
    this.setPasswordRequired(true);
    this.dialog.set('form');
  }

  protected openEdit(operator: Operator): void {
    this.list.resetMessages();
    this.editing.set(operator);
    this.form.reset({
      firstName: operator.firstName,
      lastName: operator.lastName,
      email: operator.email,
      password: '',
      role: operator.role,
    });
    this.setPasswordRequired(false);
    this.dialog.set('form');
  }

  protected openDelete(operator: Operator): void {
    this.list.resetMessages();
    this.editing.set(operator);
    this.dialog.set('delete');
  }

  protected openAssign(operator: Operator): void {
    this.list.resetMessages();
    this.editing.set(operator);
    this.assignForm.reset({ stablishmentId: 0 });
    this.dialog.set('assign');
    this.loadEstablishments();
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

    const raw = this.form.getRawValue();
    const payload: OperatorCreate = {
      firstName: raw.firstName,
      lastName: raw.lastName,
      email: raw.email,
      role: raw.role,
    };
    // Only sent when the user actually typed one: an empty string would read as
    // "set the password to nothing", not as "leave it alone".
    if (raw.password) {
      payload.password = raw.password;
    }

    const current = this.editing();

    this.list.run({
      request$: current ? this.api.update(current.uuid, payload) : this.api.create(payload),
      success: current ? 'Operador actualizado.' : 'Operador creado.',
      failure: 'No pudimos guardar el operador. Intenta nuevamente.',
      onSuccess: () => this.dialog.set(null),
    });
  }

  protected confirmDelete(): void {
    const current = this.editing();
    if (!current) {
      return;
    }

    this.list.run({
      request$: this.api.delete(current.uuid),
      success: 'Operador eliminado.',
      failure: 'No pudimos eliminar el operador. Intenta nuevamente.',
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

    // A `<select>` returns a string even for a numeric option value.
    const establishmentId = Number(this.assignForm.getRawValue().stablishmentId);

    this.list.run({
      request$: this.api.assignToStablishment(current.uuid, establishmentId),
      success: 'Operador asignado al establecimiento.',
      failure: 'No pudimos asignar el establecimiento. Intenta nuevamente.',
      onSuccess: () => this.dialog.set(null),
    });
  }

  private setPasswordRequired(required: boolean): void {
    const control = this.form.controls.password;
    control.setValidators(required ? [Validators.required] : []);
    control.updateValueAndValidity();
  }

  private loadEstablishments(): void {
    if (this.establishments().length > 0) {
      return;
    }

    this.establishmentsLoading.set(true);
    this.establishmentApi
      .getAll(0, 100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.establishments.set(page.content);
          this.establishmentsLoading.set(false);
        },
        error: () => {
          this.establishmentsLoading.set(false);
          this.list.dialogError.set('No pudimos cargar la lista de establecimientos.');
        },
      });
  }
}
