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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { BlockReasonApiService } from '../../../core/api/block-reason-api.service';
import { DoctorApiService } from '../../../core/api/doctor-api.service';
import { TimeOffApiService, type TimeOffFilters } from '../../../core/api/time-off-api.service';
import type {
  AdminDoctor,
  BlockReason,
  BlockReasonKind,
  TimeOff,
  TimeOffKind,
} from '../../../core/models';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
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

type TimeOffDialog = 'form' | 'delete';

const COLUMNS: readonly TableColumn[] = [
  { key: 'doctor', label: 'Doctor', emphasis: true },
  { key: 'range', label: 'Período' },
  { key: 'days', label: 'Días', align: 'end' },
  { key: 'reason', label: 'Motivo', wrap: true },
  { key: 'actions', label: 'Acciones', align: 'end', hiddenLabel: true },
];

const ALL_DOCTORS = '';

/**
 * app-time-off-list — Vacaciones Y Permisos. La misma pantalla dos veces.
 *
 * EL `kind` VIENE DE LA RUTA, no de un input ni de un `if`. `admin.routes.ts`
 * monta este componente en dos paths con `data.timeOffKind` distinto, y todo lo
 * demás — el título, la copia, el motivo que ofrece el desplegable, lo que
 * filtra y lo que crea — se deriva de ahí. Es el mismo criterio con el que el
 * backend guarda las dos en una tabla: el efecto sobre la agenda es idéntico y
 * lo único que cambia es cómo se llama.
 *
 * Dos componentes gemelos serían dos lugares donde arreglar el mismo bug de
 * solapamiento de fechas.
 *
 * LOS DÍAS SE CUENTAN INCLUSIVOS en las dos puntas, igual que el backend: una
 * ausencia con la misma fecha en `startDate` y `endDate` es UN día, no cero.
 */
@Component({
  selector: 'app-time-off-list',
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
    ReactiveFormsModule,
    SelectField,
  ],
  templateUrl: './time-off-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class TimeOffListComponent implements OnInit {
  private readonly api = inject(TimeOffApiService);
  private readonly doctorApi = inject(DoctorApiService);
  private readonly reasonApi = inject(BlockReasonApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly columns = COLUMNS;
  protected readonly rowKey = (row: TimeOff) => row.id;

  protected readonly messages = {
    doctor: { required: 'Selecciona un doctor.', min: 'Selecciona un doctor.' },
    startDate: { required: 'La fecha de inicio es obligatoria.' },
    endDate: { required: 'La fecha de fin es obligatoria.' },
  } as const;

  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });

  /** `TIMEOFF_VACATION` salvo que la ruta diga lo contrario. */
  protected readonly kind = computed<TimeOffKind>(() => {
    const value = this.data()['timeOffKind'];
    return value === 'TIMEOFF_PERMISSION' ? 'TIMEOFF_PERMISSION' : 'TIMEOFF_VACATION';
  });

  protected readonly isPermission = computed(() => this.kind() === 'TIMEOFF_PERMISSION');
  protected readonly heading = computed(() => (this.isPermission() ? 'Permisos' : 'Vacaciones'));
  protected readonly itemLabel = computed(() => (this.isPermission() ? 'permisos' : 'vacaciones'));

  protected readonly description = computed(() =>
    this.isPermission()
      ? 'Ausencias puntuales que bloquean la agenda del doctor.'
      : 'Períodos de vacaciones que bloquean la agenda del doctor.',
  );

  /** El desplegable de motivos ofrece solo los del tipo de esta pantalla. */
  private readonly reasonKind = computed<BlockReasonKind>(() =>
    this.isPermission() ? 'REASON_PERMISSION' : 'REASON_VACATION',
  );

  protected readonly filters = signal<TimeOffFilters>({});

  protected readonly list = createAdminListStore<TimeOff>({
    destroyRef: this.destroyRef,
    load: (page) => this.api.getAll({ ...this.filters(), kind: this.kind() }, page, 10),
  });

  protected readonly dialog = signal<TimeOffDialog | null>(null);
  protected readonly editing = signal<TimeOff | null>(null);

  private readonly doctors = signal<readonly AdminDoctor[]>([]);
  protected readonly doctorsLoading = signal(false);
  private readonly reasons = signal<readonly BlockReason[]>([]);
  protected readonly reasonsLoading = signal(false);

  protected readonly doctorOptions = computed<readonly SelectOption[]>(() =>
    this.doctors().map((doctor) => ({
      value: doctor.uuid,
      label: `${doctor.firstName} ${doctor.lastName} — ${doctor.speciality}`,
    })),
  );

  protected readonly doctorFilterOptions = computed<readonly SelectOption[]>(() => [
    { value: ALL_DOCTORS, label: 'Todos los doctores' },
    ...this.doctorOptions(),
  ]);

  protected readonly reasonOptions = computed<readonly SelectOption[]>(() => [
    { value: 0, label: 'Sin motivo específico' },
    ...this.reasons().map((reason) => ({ value: reason.id, label: reason.name })),
  ]);

  protected readonly form = this.fb.nonNullable.group({
    doctorUuid: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    reasonId: [0],
    notes: [''],
  });

  protected readonly filterForm = this.fb.nonNullable.group({
    doctorUuid: [ALL_DOCTORS],
  });

  ngOnInit(): void {
    this.list.loadPage(0);
    this.loadDoctors();
    this.loadReasons();

    this.filterForm.controls.doctorUuid.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.filters.update((current) => ({ ...current, doctorId: value || undefined }));
        this.list.loadPage(0);
      });
  }

  protected doctorName(item: TimeOff): string {
    return item.doctor ? `${item.doctor.firstName} ${item.doctor.lastName}` : '—';
  }

  /** Inclusivo en las dos puntas: mismo día de inicio y fin es 1, no 0. */
  protected dayCount(item: TimeOff): number {
    const start = new Date(`${item.startDate}T00:00:00`);
    const end = new Date(`${item.endDate}T00:00:00`);
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    return Math.max(1, days + 1);
  }

  protected onRangeChange(range: DateRange): void {
    this.filters.update((current) => ({ ...current, from: range.from, to: range.to }));
    this.list.loadPage(0);
  }

  protected openCreate(): void {
    this.list.resetMessages();
    this.editing.set(null);
    this.form.reset({ doctorUuid: '', startDate: '', endDate: '', reasonId: 0, notes: '' });
    this.dialog.set('form');
  }

  protected openEdit(item: TimeOff): void {
    this.list.resetMessages();
    this.editing.set(item);
    this.form.reset({
      doctorUuid: item.doctor?.uuid ?? '',
      startDate: item.startDate,
      endDate: item.endDate,
      reasonId: item.reason?.id ?? 0,
      notes: item.notes ?? '',
    });
    this.dialog.set('form');
  }

  protected openDelete(item: TimeOff): void {
    this.list.resetMessages();
    this.editing.set(item);
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
    // El `<select>` devuelve string aunque la opción se bindee numérica.
    const reasonId = Number(raw.reasonId);

    const payload = {
      doctor: { uuid: raw.doctorUuid },
      kind: this.kind(),
      startDate: raw.startDate,
      endDate: raw.endDate,
      reason: reasonId > 0 ? { id: reasonId } : undefined,
      notes: raw.notes || undefined,
    };

    const current = this.editing();

    this.list.run({
      request$: current ? this.api.update(current.id, payload) : this.api.create(payload),
      success: current ? 'Ausencia actualizada.' : 'Ausencia registrada.',
      // El backend rechaza rangos invertidos y solapamientos con un mensaje
      // propio; este es el respaldo cuando la respuesta no trae ninguno.
      failure: 'No pudimos guardar la ausencia. Revisa que las fechas no se pisen con otra.',
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
      success: 'Ausencia eliminada.',
      failure: 'No pudimos eliminar la ausencia. Intenta nuevamente.',
      reloadPage: this.list.pageAfterDelete(),
      onSuccess: () => this.dialog.set(null),
    });
  }

  private loadDoctors(): void {
    this.doctorsLoading.set(true);
    this.doctorApi
      .getAll(0, 200)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.doctors.set(page.content);
          this.doctorsLoading.set(false);
        },
        error: () => this.doctorsLoading.set(false),
      });
  }

  private loadReasons(): void {
    this.reasonsLoading.set(true);
    this.reasonApi
      .getActive(this.reasonKind())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reasons) => {
          this.reasons.set(reasons);
          this.reasonsLoading.set(false);
        },
        error: () => this.reasonsLoading.set(false),
      });
  }
}
