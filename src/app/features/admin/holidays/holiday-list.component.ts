import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { BlockReasonApiService } from '../../../core/api/block-reason-api.service';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { HolidayApiService } from '../../../core/api/holiday-api.service';
import { extractApiErrorMessage } from '../metrics-shared/turn-status.util';
import type { BlockReason, Establishment, Holiday, Page } from '../../../core/models';

/**
 * app-holiday-list — "Bloqueo de citas > Días feriados"
 * (`GET/POST/PUT/DELETE /api/holidays`).
 *
 * `stablishment` absent/`null` = "todas las sedes" (global holiday) — the
 * list renders that explicitly as a chip instead of a blank cell (a blank
 * cell reads as "missing data", not "applies everywhere"), and the create /
 * edit form's establishment `<select>` has "Todas las sedes" as its OWN
 * option (value `""`) rather than defaulting silently.
 *
 * `conflictingScheduleIds` (booked turns the backend could NOT auto-block,
 * see `HolidayService#create/update` in Backend_QMS) is ONLY present on the
 * create/update response body, never on a list refresh — so it is surfaced
 * immediately as a banner that stays until the admin dismisses it
 * explicitly. It must never share the auto-clearing timed-feedback pattern
 * `turn-list.component.ts#showFeedback` uses for routine success messages:
 * losing this one silently is exactly the "admin thinks the day is closed,
 * three patients still show up" failure this screen exists to prevent.
 */
@Component({
  selector: 'app-holiday-list',
  imports: [FormsModule, RouterLink],
  templateUrl: './holiday-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolidayListComponent implements OnInit {
  private readonly api = inject(HolidayApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly reasonApi = inject(BlockReasonApiService);

  protected readonly establishments = signal<Establishment[]>([]);
  protected readonly reasons = signal<BlockReason[]>([]);

  protected readonly data = signal<Page<Holiday> | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly filterStablishmentId = signal<number | null>(null);

  // Alerta persistente de conflictos — NO se auto-oculta con un timeout.
  protected readonly conflictWarning = signal<{ scheduleIds: number[]; context: string } | null>(null);

  // Modal Crear / Editar
  protected readonly isFormModalOpen = signal<boolean>(false);
  protected readonly editingItem = signal<Holiday | null>(null);
  protected readonly formLoading = signal<boolean>(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly submitAttempted = signal<boolean>(false);

  protected readonly formDate = signal<string>('');
  protected readonly formDescription = signal<string>('');
  protected readonly formStablishmentId = signal<number | null>(null);
  protected readonly formReasonId = signal<number | null>(null);

  protected readonly formValid = computed(
    () => !!this.formDate() && !!this.formDescription().trim() && this.formReasonId() != null,
  );

  // Modal Eliminar
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly deletingItem = signal<Holiday | null>(null);

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadPage(0);
  }

  private loadCatalogs(): void {
    this.establishmentApi.getAll(0, 100).subscribe({
      next: (page) => this.establishments.set(page.content ?? []),
      error: () => this.establishments.set([]),
    });
    this.reasonApi.getAll(0, 100).subscribe({
      next: (page) => this.reasons.set(page.content ?? []),
      error: () => this.reasons.set([]),
    });
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getAll(page, 10, this.filterStablishmentId() ?? undefined).subscribe({
      next: (pageData) => {
        this.data.set(pageData);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudieron cargar los feriados.'));
        this.loading.set(false);
      },
    });
  }

  onFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterStablishmentId.set(value ? Number(value) : null);
    this.loadPage(0);
  }

  establishmentName(id: number): string {
    return this.establishments().find((e) => e.id === id)?.name ?? `Sede #${id}`;
  }

  dismissConflictWarning(): void {
    this.conflictWarning.set(null);
  }

  // --- Modal Crear / Editar ---
  openCreateModal(): void {
    this.editingItem.set(null);
    this.formDate.set('');
    this.formDescription.set('');
    this.formStablishmentId.set(null);
    this.formReasonId.set(this.reasons()[0]?.id ?? null);
    this.formError.set(null);
    this.submitAttempted.set(false);
    this.isFormModalOpen.set(true);
  }

  openEditModal(item: Holiday): void {
    this.editingItem.set(item);
    this.formDate.set(item.date);
    this.formDescription.set(item.description);
    this.formStablishmentId.set(item.stablishment?.id ?? null);
    this.formReasonId.set(item.reason.id);
    this.formError.set(null);
    this.submitAttempted.set(false);
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.editingItem.set(null);
  }

  onFormStablishmentChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.formStablishmentId.set(value ? Number(value) : null);
  }

  onFormReasonChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.formReasonId.set(value ? Number(value) : null);
  }

  onDateInput(event: Event): void {
    this.formDate.set((event.target as HTMLInputElement).value);
  }

  onDescriptionInput(event: Event): void {
    this.formDescription.set((event.target as HTMLInputElement).value);
  }

  onFormSubmit(): void {
    this.submitAttempted.set(true);
    if (!this.formValid()) {
      return;
    }

    const reasonId = this.formReasonId();
    if (reasonId == null) return;

    const payload = {
      date: this.formDate(),
      description: this.formDescription().trim(),
      stablishment: this.formStablishmentId() != null ? { id: this.formStablishmentId()! } : null,
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
          extractApiErrorMessage(err, editing ? 'Ocurrió un error al actualizar el feriado.' : 'Ocurrió un error al crear el feriado.'),
        );
      },
    });
  }

  private reportConflictsIfAny(saved: Holiday): void {
    const ids = saved.conflictingScheduleIds ?? [];
    if (ids.length === 0) {
      return;
    }

    const scope = saved.stablishment ? saved.stablishment.name : 'todas las sedes';
    this.conflictWarning.set({
      scheduleIds: ids,
      context: `${saved.date} · ${scope}`,
    });
  }

  // --- Modal Eliminar ---
  openDeleteModal(item: Holiday): void {
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
        this.formError.set(extractApiErrorMessage(err, 'Ocurrió un error al eliminar el feriado.'));
      },
    });
  }
}
