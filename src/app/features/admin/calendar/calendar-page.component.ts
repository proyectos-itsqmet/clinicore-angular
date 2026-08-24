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
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { DoctorApiService } from '../../../core/api/doctor-api.service';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { ScheduleApiService } from '../../../core/api/schedule-api.service';
import type {
  AdminDoctor,
  Establishment,
  Schedule,
  ScheduleFilters,
  ScheduleStatus,
} from '../../../core/models';
import { Pill, type PillTone } from '../../../shared/ui/atoms/pill/pill';
import { DataTable, type TableColumn } from '../../../shared/ui/molecules/data-table/data-table';
import {
  DateRangeFilter,
  type DateRange,
} from '../../../shared/ui/molecules/date-range-filter/date-range-filter';
import { ErrorState } from '../../../shared/ui/molecules/error-state/error-state';
import { InlineAlert } from '../../../shared/ui/molecules/inline-alert/inline-alert';
import { PageHeader } from '../../../shared/ui/molecules/page-header/page-header';
import { Pagination } from '../../../shared/ui/molecules/pagination/pagination';
import {
  SelectField,
  type SelectOption,
} from '../../../shared/ui/molecules/select-field/select-field';
import { createAdminListStore } from '../admin-list-store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'date', label: 'Fecha', emphasis: true },
  { key: 'hour', label: 'Hora' },
  { key: 'doctor', label: 'Doctor' },
  { key: 'service', label: 'Servicio', wrap: true },
  { key: 'stablishment', label: 'Sede' },
  { key: 'status', label: 'Estado' },
];

/** Página grande a propósito — ver el doc de la clase. */
const PAGE_SIZE = 50;

const ANY = '';

const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: ANY, label: 'Cualquier estado' },
  { value: 'STATUS_FREE', label: 'Libre' },
  { value: 'STATUS_OCCUPIED', label: 'Ocupado' },
  { value: 'STATUS_UNAVAILABLE', label: 'No disponible' },
];

const STATUS_LABELS: Readonly<Record<ScheduleStatus, string>> = {
  STATUS_FREE: 'Libre',
  STATUS_OCCUPIED: 'Ocupado',
  STATUS_UNAVAILABLE: 'No disponible',
};

const STATUS_TONES: Readonly<Record<ScheduleStatus, PillTone>> = {
  STATUS_FREE: 'ok',
  STATUS_OCCUPIED: 'tint',
  STATUS_UNAVAILABLE: 'plain',
};

/**
 * app-calendar-page — Calendario.
 *
 * ES UNA AGENDA EN TABLA, NO UNA GRILLA MENSUAL, y conviene decirlo antes de que
 * alguien la abra esperando otra cosa. Una grilla de mes necesita una librería de
 * calendario o unos cuantos cientos de líneas de layout propio; esto muestra los
 * mismos cupos, filtrables por rango, doctor, sede y estado, y se puede leer y
 * ordenar. Cuando la grilla sea el requisito, esta pantalla ya tiene resuelto lo
 * de abajo: los filtros y el endpoint.
 *
 * PÁGINA DE 50 Y NO DE 10. Un rango de un mes pasa las diez filas enseguida, y
 * un calendario que muestra solo las primeras diez de marzo es un calendario con
 * agujeros y sin ningún error visible. Con 50 y el paginador a la vista, lo que
 * falta se ve que falta.
 *
 * SOLO LECTURA. `POST /api/schedules` y `/generate` existen, pero generar agenda
 * es una operación con reglas propias (intervalos, descanso de mediodía,
 * validación de que el doctor tenga el servicio y la sede asignados) y merece su
 * propia pantalla, no un botón acá.
 */
@Component({
  selector: 'app-calendar-page',
  imports: [
    DataTable,
    DatePipe,
    DateRangeFilter,
    ErrorState,
    InlineAlert,
    PageHeader,
    Pagination,
    Pill,
    ReactiveFormsModule,
    SelectField,
  ],
  templateUrl: './calendar-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class CalendarPageComponent implements OnInit {
  private readonly api = inject(ScheduleApiService);
  private readonly doctorApi = inject(DoctorApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly columns = COLUMNS;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly rowKey = (row: Schedule) => row.id;

  protected readonly filters = signal<ScheduleFilters>({});

  protected readonly list = createAdminListStore<Schedule>({
    destroyRef: this.destroyRef,
    load: (page) => this.api.getAll(this.filters(), page, PAGE_SIZE),
  });

  private readonly doctors = signal<readonly AdminDoctor[]>([]);
  protected readonly doctorsLoading = signal(false);
  private readonly establishments = signal<readonly Establishment[]>([]);
  protected readonly establishmentsLoading = signal(false);

  protected readonly doctorOptions = computed<readonly SelectOption[]>(() => [
    { value: ANY, label: 'Todos los doctores' },
    ...this.doctors().map((doctor) => ({
      value: doctor.uuid,
      label: `${doctor.firstName} ${doctor.lastName}`,
    })),
  ]);

  protected readonly establishmentOptions = computed<readonly SelectOption[]>(() => [
    { value: ANY, label: 'Todas las sedes' },
    ...this.establishments().map((item) => ({ value: item.id, label: item.name })),
  ]);

  protected readonly filterForm = this.fb.nonNullable.group({
    doctorId: [ANY],
    // Todos los filtros son STRING aunque la sede sea numerica: el valor de un
    // `<select>` siempre llega como string, y `FieldControl` es una union de
    // tipos concretos — un `FormControl<string | number>` no encaja en ninguno.
    // La conversion se hace al armar el filtro, no en el tipo del control.
    stablishmentId: [ANY],
    status: [ANY],
  });

  ngOnInit(): void {
    this.list.loadPage(0);
    this.loadDoctors();
    this.loadEstablishments();

    this.filterForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const raw = this.filterForm.getRawValue();
      const stablishmentId = Number(raw.stablishmentId);

      this.filters.update((current) => ({
        ...current,
        doctorId: raw.doctorId || undefined,
        stablishmentId: raw.stablishmentId === ANY ? undefined : stablishmentId,
        status: (raw.status || undefined) as ScheduleStatus | undefined,
      }));
      this.list.loadPage(0);
    });
  }

  protected statusLabel(status: ScheduleStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  protected statusTone(status: ScheduleStatus): PillTone {
    return STATUS_TONES[status] ?? 'plain';
  }

  protected doctorName(schedule: Schedule): string {
    return schedule.doctor ? `${schedule.doctor.firstName} ${schedule.doctor.lastName}` : '—';
  }

  protected onRangeChange(range: DateRange): void {
    this.filters.update((current) => ({ ...current, from: range.from, to: range.to }));
    this.list.loadPage(0);
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
