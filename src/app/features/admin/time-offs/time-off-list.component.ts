import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { SelectField, type SelectOption } from '../../../shared/ui/molecules/select-field/select-field';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { BlockReasonApiService } from '../../../core/api/block-reason-api.service';
import { DoctorApiService } from '../../../core/api/doctor-api.service';
import { TimeOffApiService } from '../../../core/api/time-off-api.service';
import { extractApiErrorMessage } from '../metrics-shared/turn-status.util';
import type { AdminDoctor, BlockReason, Page, TimeOff, TimeOffKind } from '../../../core/models';

/** Per-`kind` copy — same entity/screen, only the Spanish labels (and grammatical gender) differ. */
const TIME_OFF_KIND_META: Record<
  TimeOffKind,
  { title: string; subtitle: string; newLabel: string; loadingMessage: string; emptyMessage: string }
> = {
  KIND_VACATION: {
    title: 'Vacaciones',
    subtitle: 'Rangos de fechas en los que un doctor está de vacaciones.',
    newLabel: 'Nueva Vacación',
    loadingMessage: 'Cargando vacaciones...',
    emptyMessage: 'No hay vacaciones registradas.',
  },
  KIND_PERMISSION: {
    title: 'Permisos',
    subtitle: 'Rangos de fechas en los que un doctor tiene un permiso.',
    newLabel: 'Nuevo Permiso',
    loadingMessage: 'Cargando permisos...',
    emptyMessage: 'No hay permisos registrados.',
  },
};

/**
 * app-time-off-list — "Bloqueo de citas > Vacaciones" AND "> Permisos"
 * (`GET/POST/PUT/DELETE /api/time-offs`).
 *
 * ONE component backs BOTH destinations, parameterised by `kind` from the
 * route's `data` (see `vacaciones.routes.ts` / `permisos.routes.ts`) — the
 * same choice `admin.routes.ts` already makes for the whole admin panel
 * (generate from one source instead of hand-duplicating two near-identical
 * screens that WILL drift). `TimeOff.kind` is fixed by which route loaded
 * this component; the create/edit form never lets it be picked.
 *
 * `conflictingScheduleIds` follows the exact same persistent-banner contract
 * as `HolidayListComponent` — see that component's doc for why it must never
 * auto-dismiss.
 */
@Component({
  selector: 'app-time-off-list',
  imports: [FormsModule, RouterLink, SelectField],
  templateUrl: './time-off-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeOffListComponent implements OnInit {
  private readonly api = inject(TimeOffApiService);
  private readonly doctorApi = inject(DoctorApiService);
  private readonly reasonApi = inject(BlockReasonApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly kind = this.route.snapshot.data['kind'] as TimeOffKind;
  protected readonly meta = TIME_OFF_KIND_META[this.kind];

  protected readonly doctors = signal<AdminDoctor[]>([]);
  protected readonly reasons = signal<BlockReason[]>([]);

  /** Los doctores como opciones, con la especialidad en el renglón de apoyo. */
  protected readonly doctorOptions = computed<readonly SelectOption[]>(() =>
    this.doctors().map((d) => ({
      value: d.uuid,
      label: `Dr(a). ${d.firstName} ${d.lastName}`,
      hint: d.speciality,
    })),
  );

  protected readonly doctorFilterOptions = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Todos los doctores' },
    ...this.doctorOptions(),
  ]);

  protected readonly reasonOptions = computed<readonly SelectOption[]>(() =>
    this.reasons().map((r) => ({ value: String(r.id), label: r.description })),
  );

  protected readonly data = signal<Page<TimeOff> | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly filterDoctorUuid = signal<string | null>(null);

  // Alerta persistente de conflictos — NO se auto-oculta con un timeout.
  protected readonly conflictWarning = signal<{ scheduleIds: number[]; context: string } | null>(null);

  // Modal Crear / Editar
  protected readonly isFormModalOpen = signal<boolean>(false);
  protected readonly editingItem = signal<TimeOff | null>(null);
  protected readonly formLoading = signal<boolean>(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly submitAttempted = signal<boolean>(false);

  protected readonly formDoctorUuid = signal<string | null>(null);
  protected readonly formStartDate = signal<string>('');
  protected readonly formEndDate = signal<string>('');
  protected readonly formReasonId = signal<number | null>(null);

  /** Pure ISO string comparison — never `new Date(...)` (UTC-midnight trap, see project rules). */
  protected readonly dateRangeInvalid = computed(() => {
    const start = this.formStartDate();
    const end = this.formEndDate();
    return !!start && !!end && end < start;
  });

  protected readonly formValid = computed(
    () =>
      !!this.formDoctorUuid() &&
      !!this.formStartDate() &&
      !!this.formEndDate() &&
      this.formReasonId() != null &&
      !this.dateRangeInvalid(),
  );

  // Modal Eliminar
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly deletingItem = signal<TimeOff | null>(null);

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadPage(0);
  }

  private loadCatalogs(): void {
    this.doctorApi.getAll(0, 100).subscribe({
      next: (page) => this.doctors.set(page.content ?? []),
      error: () => this.doctors.set([]),
    });
    this.reasonApi.getAll(0, 100).subscribe({
      next: (page) => this.reasons.set(page.content ?? []),
      error: () => this.reasons.set([]),
    });
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getAll(page, 10, { doctorId: this.filterDoctorUuid() ?? undefined, kind: this.kind }).subscribe({
      next: (pageData) => {
        this.data.set(pageData);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, `No se pudieron cargar los registros de ${this.meta.title.toLowerCase()}.`));
        this.loading.set(false);
      },
    });
  }

  onFilterChange(value: string): void {
    this.filterDoctorUuid.set(value || null);
    this.loadPage(0);
  }

  dismissConflictWarning(): void {
    this.conflictWarning.set(null);
  }

  // --- Modal Crear / Editar ---
  openCreateModal(): void {
    this.editingItem.set(null);
    this.formDoctorUuid.set(this.doctors()[0]?.uuid ?? null);
    this.formStartDate.set('');
    this.formEndDate.set('');
    this.formReasonId.set(this.reasons()[0]?.id ?? null);
    this.formError.set(null);
    this.submitAttempted.set(false);
    this.isFormModalOpen.set(true);
  }

  openEditModal(item: TimeOff): void {
    this.editingItem.set(item);
    this.formDoctorUuid.set(item.doctor.uuid);
    this.formStartDate.set(item.startDate);
    this.formEndDate.set(item.endDate);
    this.formReasonId.set(item.reason.id);
    this.formError.set(null);
    this.submitAttempted.set(false);
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.editingItem.set(null);
  }

  onFormDoctorChange(value: string): void {
    this.formDoctorUuid.set(value || null);
  }

  onFormStartDateInput(event: Event): void {
    this.formStartDate.set((event.target as HTMLInputElement).value);
  }

  onFormEndDateInput(event: Event): void {
    this.formEndDate.set((event.target as HTMLInputElement).value);
  }

  onFormReasonChange(value: string): void {
    this.formReasonId.set(value ? Number(value) : null);
  }

  onFormSubmit(): void {
    this.submitAttempted.set(true);
    if (!this.formValid()) {
      return;
    }

    const doctorUuid = this.formDoctorUuid();
    const reasonId = this.formReasonId();
    if (!doctorUuid || reasonId == null) return;

    const payload = {
      doctor: { uuid: doctorUuid },
      kind: this.kind,
      startDate: this.formStartDate(),
      endDate: this.formEndDate(),
      reason: { id: reasonId },
    };

    this.formLoading.set(true);
    this.formError.set(null);

    const editing = this.editingItem();
    const request = editing ? this.api.update(editing.id, payload) : this.api.create(payload);

    request.subscribe({
      next: (saved) => {
        this.formLoading.set(false);
        this.closeFormModal();
        this.reportConflictsIfAny(saved);
        this.loadPage(this.data()?.number ?? 0);
      },
      error: (err) => {
        this.formLoading.set(false);
        this.formError.set(
          extractApiErrorMessage(err, editing ? 'Ocurrió un error al actualizar el registro.' : 'Ocurrió un error al crear el registro.'),
        );
      },
    });
  }

  private reportConflictsIfAny(saved: TimeOff): void {
    const ids = saved.conflictingScheduleIds ?? [];
    if (ids.length === 0) {
      return;
    }

    this.conflictWarning.set({
      scheduleIds: ids,
      context: `Dr(a). ${saved.doctor.firstName} ${saved.doctor.lastName} · ${saved.startDate} → ${saved.endDate}`,
    });
  }

  doctorName(item: TimeOff): string {
    return `${item.doctor.firstName} ${item.doctor.lastName}`;
  }

  // --- Modal Eliminar ---
  openDeleteModal(item: TimeOff): void {
    this.deletingItem.set(item);
    this.formError.set(null);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.deletingItem.set(null);
  }

  confirmDelete(): void {
    const item = this.deletingItem();
    if (!item) return;

    this.formLoading.set(true);
    this.formError.set(null);

    this.api.delete(item.id).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeDeleteModal();
        this.loadPage(this.data()?.number ?? 0);
      },
      error: (err) => {
        this.formLoading.set(false);
        this.formError.set(extractApiErrorMessage(err, 'Ocurrió un error al eliminar el registro.'));
      },
    });
  }
}
