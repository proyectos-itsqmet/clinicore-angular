import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ServicioApiService } from '../../../core/api/servicio-api.service';
import { SessionPlanApiService } from '../../../core/api/session-plan-api.service';
import { fetchAllPages } from '../../../core/api/fetch-all-pages.util';
import { extractApiErrorMessage, isPermissionDeniedError } from '../metrics-shared/turn-status.util';
import type { Page, Servicio, SessionPlan, SessionPlanCreate } from '../../../core/models';

/**
 * app-precios-sesiones-list — "Precios > Sesiones"
 * (`GET/POST/PUT/DELETE /api/session-plans`).
 *
 * DELIBERATELY a CATALOG-ONLY screen: `SessionPlan` has no consumption
 * ledger anywhere in this codebase (no entity ties a purchased plan to the
 * sessions a specific patient has used). This screen must never render
 * anything shaped like "4 of 10 remaining" — that data does not exist, and
 * showing it would promise a per-patient balance the system cannot deliver.
 * The permanent banner in the template says so explicitly.
 */
@Component({
  selector: 'app-precios-sesiones-list',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './precios-sesiones-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreciosSesionesListComponent implements OnInit {
  private readonly api = inject(SessionPlanApiService);
  private readonly servicioApi = inject(ServicioApiService);

  protected readonly data = signal<Page<SessionPlan> | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filterServicioId = signal<number | null>(null);

  // Catálogo de servicios (todas las páginas) para el filtro y el <select> del formulario.
  protected readonly serviciosCatalog = signal<Servicio[]>([]);
  protected readonly serviciosCatalogLoading = signal<boolean>(false);
  protected readonly serviciosCatalogError = signal<string | null>(null);
  protected readonly serviciosCatalogIncomplete = signal<boolean>(false);

  // Modal Crear / Editar
  protected readonly isFormModalOpen = signal<boolean>(false);
  protected readonly editingItem = signal<SessionPlan | null>(null);
  protected readonly formLoading = signal<boolean>(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly submitAttempted = signal<boolean>(false);

  protected readonly formServicioId = signal<number | null>(null);
  protected readonly formName = signal<string>('');
  protected readonly formSessionCount = signal<string>('');
  protected readonly formPrice = signal<string>('');

  protected readonly formValid = computed(() => {
    const count = Number(this.formSessionCount());
    const price = Number(this.formPrice());
    return (
      this.formServicioId() != null &&
      !!this.formName().trim() &&
      this.formSessionCount().trim() !== '' &&
      Number.isInteger(count) &&
      count >= 1 &&
      this.formPrice().trim() !== '' &&
      Number.isFinite(price) &&
      price >= 0
    );
  });

  /** Template-friendly validity checks (Angular templates cannot call the global `Number(...)`/`Number.isInteger(...)`). */
  protected readonly formSessionCountInvalid = computed(() => {
    const raw = this.formSessionCount().trim();
    const count = Number(raw);
    return raw === '' || !Number.isInteger(count) || count < 1;
  });

  protected readonly formPriceInvalid = computed(() => {
    const raw = this.formPrice().trim();
    const price = Number(raw);
    return raw === '' || !Number.isFinite(price) || price < 0;
  });

  /** Live preview using the same formula the backend uses (`price / sessionCount`), purely informational. */
  protected readonly formPricePerSessionPreview = computed(() => {
    const count = Number(this.formSessionCount());
    const price = Number(this.formPrice());
    if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(price)) return null;
    return price / count;
  });

  // Modal Eliminar
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly deletingItem = signal<SessionPlan | null>(null);

  ngOnInit(): void {
    this.loadCatalog();
    this.loadPage(0);
  }

  private loadCatalog(): void {
    this.serviciosCatalogLoading.set(true);
    this.serviciosCatalogError.set(null);
    fetchAllPages((page) => this.servicioApi.getAll(page, 100)).subscribe({
      next: ({ items, complete }) => {
        this.serviciosCatalog.set(items);
        this.serviciosCatalogIncomplete.set(!complete);
        this.serviciosCatalogLoading.set(false);
      },
      error: (err) => {
        this.serviciosCatalogError.set(extractApiErrorMessage(err, 'No se pudo cargar el catálogo de servicios.'));
        this.serviciosCatalogLoading.set(false);
      },
    });
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getAll(page, 10, this.filterServicioId() ?? undefined).subscribe({
      next: (pageData) => {
        this.data.set(pageData);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudieron cargar los planes de sesiones.'));
        this.loading.set(false);
      },
    });
  }

  onFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterServicioId.set(value ? Number(value) : null);
    this.loadPage(0);
  }

  private describeWriteError(err: unknown, fallback: string): string {
    const message = extractApiErrorMessage(err, fallback);
    if (isPermissionDeniedError(err, message)) {
      return 'No tienes permisos para esta acción: solo un Administrador puede crear, editar o eliminar planes de sesiones.';
    }
    return message;
  }

  // --- Crear / Editar ---
  openCreateModal(): void {
    this.editingItem.set(null);
    this.formServicioId.set(this.serviciosCatalog()[0]?.id ?? null);
    this.formName.set('');
    this.formSessionCount.set('');
    this.formPrice.set('');
    this.formError.set(null);
    this.submitAttempted.set(false);
    this.isFormModalOpen.set(true);
  }

  openEditModal(item: SessionPlan): void {
    this.editingItem.set(item);
    this.formServicioId.set(item.servicio.id);
    this.formName.set(item.name);
    this.formSessionCount.set(String(item.sessionCount));
    this.formPrice.set(String(item.price));
    this.formError.set(null);
    this.submitAttempted.set(false);
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.editingItem.set(null);
  }

  onFormServicioChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.formServicioId.set(value ? Number(value) : null);
  }

  onFormNameInput(event: Event): void {
    this.formName.set((event.target as HTMLInputElement).value);
  }

  onFormSessionCountInput(event: Event): void {
    this.formSessionCount.set((event.target as HTMLInputElement).value);
  }

  onFormPriceInput(event: Event): void {
    this.formPrice.set((event.target as HTMLInputElement).value);
  }

  onFormSubmit(): void {
    this.submitAttempted.set(true);
    if (!this.formValid()) {
      return;
    }

    const servicioId = this.formServicioId();
    if (servicioId == null) return;

    const payload: SessionPlanCreate = {
      servicio: { id: servicioId },
      name: this.formName().trim(),
      sessionCount: Number(this.formSessionCount()),
      price: Number(this.formPrice()),
    };

    this.formLoading.set(true);
    this.formError.set(null);

    const editing = this.editingItem();
    const request = editing ? this.api.update(editing.id, payload) : this.api.create(payload);

    request.subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeFormModal();
        this.loadPage(this.data()?.number ?? 0);
      },
      error: (err) => {
        this.formLoading.set(false);
        this.formError.set(
          this.describeWriteError(err, editing ? 'Ocurrió un error al actualizar el plan.' : 'Ocurrió un error al crear el plan.'),
        );
      },
    });
  }

  // --- Eliminar ---
  openDeleteModal(item: SessionPlan): void {
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
        this.formError.set(this.describeWriteError(err, 'Ocurrió un error al eliminar el plan.'));
      },
    });
  }
}
