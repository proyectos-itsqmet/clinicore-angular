import { DatePipe } from '@angular/common';
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
import { HolidayApiService, type HolidayFilters } from '../../../core/api/holiday-api.service';
import type { Establishment, Holiday } from '../../../core/models';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Pill } from '../../../shared/ui/atoms/pill/pill';
import { ConfirmDialog } from '../../../shared/ui/molecules/confirm-dialog/confirm-dialog';
import { DataTable, type TableColumn } from '../../../shared/ui/molecules/data-table/data-table';
import {
  DateRangeFilter,
  type DateRange,
} from '../../../shared/ui/molecules/date-range-filter/date-range-filter';
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

type HolidayDialog = 'form' | 'delete';

const COLUMNS: readonly TableColumn[] = [
  { key: 'date', label: 'Fecha', emphasis: true },
  { key: 'name', label: 'Nombre', wrap: true },
  { key: 'scope', label: 'Alcance' },
  { key: 'actions', label: 'Acciones', align: 'end', hiddenLabel: true },
];

/** `0` es el centinela de "todas las sedes" en los dos selects de esta pantalla. */
const ALL_ESTABLISHMENTS = 0;

/**
 * app-holiday-list — Bloqueo de citas → Días feriados.
 *
 * EL ALCANCE ES UNA COLUMNA, no un detalle escondido. Un feriado sin sede es
 * nacional y afecta a todas; uno con sede afecta a esa sola. Mostrar solo el
 * nombre haría que las dos filas se lean igual siendo cosas distintas.
 *
 * Y OJO CON EL FILTRO POR SEDE: el backend, cuando le pedís una sede, devuelve
 * los de esa sede **más los nacionales** — que es la respuesta correcta, porque
 * el 25 de diciembre le afecta igual. Por eso la etiqueta del filtro lo dice en
 * vez de dejar que el usuario deduzca por qué aparecen filas que no cargó para
 * esa sede.
 */
@Component({
  selector: 'app-holiday-list',
  imports: [
    Button,
    ConfirmDialog,
    DataTable,
    DatePipe,
    DateRangeFilter,
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
  templateUrl: './holiday-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class HolidayListComponent implements OnInit {
  private readonly api = inject(HolidayApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly columns = COLUMNS;
  protected readonly rowKey = (row: Holiday) => row.id;

  protected readonly messages = {
    date: { required: 'La fecha es obligatoria.' },
    name: { required: 'El nombre es obligatorio.' },
  } as const;

  protected readonly filters = signal<HolidayFilters>({});

  protected readonly list = createAdminListStore<Holiday>({
    destroyRef: this.destroyRef,
    load: (page) => this.api.getAll(this.filters(), page, 10),
  });

  protected readonly dialog = signal<HolidayDialog | null>(null);
  protected readonly editing = signal<Holiday | null>(null);

  private readonly establishments = signal<readonly Establishment[]>([]);
  protected readonly establishmentsLoading = signal(false);

  /** Para el FORMULARIO: la opción neutra significa "feriado nacional". */
  protected readonly formEstablishmentOptions = computed<readonly SelectOption[]>(() => [
    { value: ALL_ESTABLISHMENTS, label: 'Nacional — todas las sedes' },
    ...this.establishments().map((item) => ({ value: item.id, label: item.name })),
  ]);

  /** Para el FILTRO: la opción neutra significa "no filtrar". */
  protected readonly filterEstablishmentOptions = computed<readonly SelectOption[]>(() => [
    { value: ALL_ESTABLISHMENTS, label: 'Todas las sedes' },
    ...this.establishments().map((item) => ({ value: item.id, label: item.name })),
  ]);

  protected readonly form = this.fb.nonNullable.group({
    date: ['', Validators.required],
    name: ['', Validators.required],
    stablishmentId: [ALL_ESTABLISHMENTS],
  });

  protected readonly filterForm = this.fb.nonNullable.group({
    stablishmentId: [ALL_ESTABLISHMENTS],
  });

  ngOnInit(): void {
    this.list.loadPage(0);
    this.loadEstablishments();

    // El filtro de sede recarga al cambiar, sin botón: es un solo valor y
    // esperar un "Aplicar" para un `<select>` es una fricción sin sentido. El
    // rango de fechas sí tiene botón, y por la razón opuesta — tipear una fecha
    // pasa por estados intermedios que dispararían requests basura.
    this.filterForm.controls.stablishmentId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const id = Number(value);
        this.filters.update((current) => ({
          ...current,
          stablishmentId: id === ALL_ESTABLISHMENTS ? undefined : id,
        }));
        this.list.loadPage(0);
      });
  }

  protected scopeLabel(holiday: Holiday): string {
    return holiday.stablishment?.name ?? 'Nacional';
  }

  protected onRangeChange(range: DateRange): void {
    this.filters.update((current) => ({ ...current, from: range.from, to: range.to }));
    this.list.loadPage(0);
  }

  protected openCreate(): void {
    this.list.resetMessages();
    this.editing.set(null);
    this.form.reset({ date: '', name: '', stablishmentId: ALL_ESTABLISHMENTS });
    this.dialog.set('form');
  }

  protected openEdit(holiday: Holiday): void {
    this.list.resetMessages();
    this.editing.set(holiday);
    this.form.reset({
      date: holiday.date,
      name: holiday.name,
      stablishmentId: holiday.stablishment?.id ?? ALL_ESTABLISHMENTS,
    });
    this.dialog.set('form');
  }

  protected openDelete(holiday: Holiday): void {
    this.list.resetMessages();
    this.editing.set(holiday);
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

    const raw = this.form.getRawValue();
    // El `<select>` devuelve string aunque la opción se haya bindeado numérica.
    const stablishmentId = Number(raw.stablishmentId);

    const payload = {
      date: raw.date,
      name: raw.name,
      stablishment: stablishmentId === ALL_ESTABLISHMENTS ? undefined : { id: stablishmentId },
    };

    const current = this.editing();

    this.list.run({
      request$: current ? this.api.update(current.id, payload) : this.api.create(payload),
      success: current ? 'Feriado actualizado.' : 'Feriado creado.',
      failure: 'No pudimos guardar el feriado. Intenta nuevamente.',
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
      success: 'Feriado eliminado.',
      failure: 'No pudimos eliminar el feriado. Intenta nuevamente.',
      reloadPage: this.list.pageAfterDelete(),
      onSuccess: () => this.dialog.set(null),
    });
  }

  private loadEstablishments(): void {
    this.establishmentsLoading.set(true);
    this.establishmentApi
      .getAll(0, 100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.establishments.set(page.content);
          this.establishmentsLoading.set(false);
        },
        error: () => this.establishmentsLoading.set(false),
      });
  }
}
