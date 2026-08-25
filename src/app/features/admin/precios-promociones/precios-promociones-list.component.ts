import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PromotionApiService } from '../../../core/api/promotion-api.service';
import { ServicioApiService } from '../../../core/api/servicio-api.service';
import { fetchAllPages } from '../../../core/api/fetch-all-pages.util';
import { extractApiErrorMessage, isPermissionDeniedError } from '../metrics-shared/turn-status.util';
import { findOverlappingPromotion, isOverlapConflictError } from './promotion-overlap.util';
import type { DiscountType, Page, Promotion, PromotionCreate, Servicio } from '../../../core/models';

const MAX_PERCENTAGE = 100;

/**
 * app-precios-promociones-list — "Precios > Promociones"
 * (`GET/POST/PUT/DELETE /api/promotions`).
 *
 * `discountType` makes the discount unit explicit everywhere it is shown or
 * entered — `PERCENTAGE` renders as `20%`, `FIXED_AMOUNT` as `$20.00`, never
 * conflated (same discipline `precios/descuentos` applies to
 * `Servicio.discount`, which is fixed-amount-only and has no type field at
 * all).
 *
 * The backend REJECTS an overlapping date range for the same `servicio`
 * (`PromotionService#rejectIfOverlapping`) with a message that does NOT name
 * the conflicting record. On that specific failure this screen fetches the
 * servicio's own promotions and names the conflict itself via
 * `findOverlappingPromotion` — see `promotion-overlap.util.ts`.
 */
@Component({
  selector: 'app-precios-promociones-list',
  imports: [FormsModule],
  templateUrl: './precios-promociones-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreciosPromocionesListComponent implements OnInit {
  private readonly api = inject(PromotionApiService);
  private readonly servicioApi = inject(ServicioApiService);

  protected readonly data = signal<Page<Promotion> | null>(null);
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
  protected readonly editingItem = signal<Promotion | null>(null);
  protected readonly formLoading = signal<boolean>(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly submitAttempted = signal<boolean>(false);
  /** Set ONLY when the backend's own overlap rejection was matched AND the lookup found the specific conflicting record. Separate from `formError` so the template can render it as its own distinct callout. */
  protected readonly conflictingPromotion = signal<Promotion | null>(null);

  protected readonly formServicioId = signal<number | null>(null);
  protected readonly formName = signal<string>('');
  protected readonly formDiscountType = signal<DiscountType | ''>('');
  protected readonly formDiscountValue = signal<string>('');
  protected readonly formStartDate = signal<string>('');
  protected readonly formEndDate = signal<string>('');

  /** Mirrors `PromotionService#validatePercentageBounds` (0 exclusive – 100 inclusive for PERCENTAGE; any positive value for FIXED_AMOUNT). */
  protected readonly formDiscountValueInvalid = computed(() => {
    const raw = this.formDiscountValue().trim();
    const value = Number(raw);
    if (raw === '' || !Number.isFinite(value) || value <= 0) return true;
    return this.formDiscountType() === 'PERCENTAGE' && value > MAX_PERCENTAGE;
  });

  /** Template-friendly split of the two distinct reasons {@link formDiscountValueInvalid} can be true, so the shown message matches the actual problem. */
  protected readonly formPercentageExceeded = computed(() => {
    const value = Number(this.formDiscountValue());
    return this.formDiscountType() === 'PERCENTAGE' && Number.isFinite(value) && value > MAX_PERCENTAGE;
  });

  /** Mirrors `PromotionService#validateDateRange`. */
  protected readonly formDateRangeInvalid = computed(() => {
    const start = this.formStartDate();
    const end = this.formEndDate();
    if (!start || !end) return true;
    return end < start; // ISO YYYY-MM-DD strings compare correctly with plain `<`.
  });

  protected readonly formValid = computed(() => {
    return (
      this.formServicioId() != null &&
      !!this.formName().trim() &&
      !!this.formDiscountType() &&
      !this.formDiscountValueInvalid() &&
      !this.formDateRangeInvalid()
    );
  });

  /** Live, unambiguous preview of what will actually be applied with the current draft values. */
  protected readonly formDiscountPreview = computed(() => {
    const raw = this.formDiscountValue().trim();
    const value = Number(raw);
    if (raw === '' || !Number.isFinite(value)) return null;
    return this.formDiscountType() === 'FIXED_AMOUNT'
      ? `$${value.toFixed(2)} de descuento fijo`
      : `${value}% de descuento sobre el precio`;
  });

  // Modal Eliminar
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly deletingItem = signal<Promotion | null>(null);

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
        this.error.set(extractApiErrorMessage(err, 'No se pudieron cargar las promociones.'));
        this.loading.set(false);
      },
    });
  }

  onFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterServicioId.set(value ? Number(value) : null);
    this.loadPage(0);
  }

  protected discountLabel(item: Pick<Promotion, 'discountType' | 'discountValue'>): string {
    return item.discountType === 'FIXED_AMOUNT' ? `$${Number(item.discountValue).toFixed(2)}` : `${item.discountValue}%`;
  }

  private describeWriteError(err: unknown, fallback: string): string {
    const message = extractApiErrorMessage(err, fallback);
    if (isPermissionDeniedError(err, message)) {
      return 'No tienes permisos para esta acción: solo un Administrador puede crear, editar o eliminar promociones.';
    }
    return message;
  }

  // --- Crear / Editar ---
  openCreateModal(): void {
    this.editingItem.set(null);
    this.formServicioId.set(this.serviciosCatalog()[0]?.id ?? null);
    this.formName.set('');
    this.formDiscountType.set('');
    this.formDiscountValue.set('');
    this.formStartDate.set('');
    this.formEndDate.set('');
    this.formError.set(null);
    this.conflictingPromotion.set(null);
    this.submitAttempted.set(false);
    this.isFormModalOpen.set(true);
  }

  openEditModal(item: Promotion): void {
    this.editingItem.set(item);
    this.formServicioId.set(item.servicio.id);
    this.formName.set(item.name);
    this.formDiscountType.set(item.discountType);
    this.formDiscountValue.set(String(item.discountValue));
    this.formStartDate.set(item.startDate);
    this.formEndDate.set(item.endDate);
    this.formError.set(null);
    this.conflictingPromotion.set(null);
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

  onFormDiscountTypeChange(event: Event): void {
    this.formDiscountType.set((event.target as HTMLSelectElement).value as DiscountType | '');
  }

  onFormDiscountValueInput(event: Event): void {
    this.formDiscountValue.set((event.target as HTMLInputElement).value);
  }

  onFormStartDateInput(event: Event): void {
    this.formStartDate.set((event.target as HTMLInputElement).value);
  }

  onFormEndDateInput(event: Event): void {
    this.formEndDate.set((event.target as HTMLInputElement).value);
  }

  onFormSubmit(): void {
    this.submitAttempted.set(true);
    this.conflictingPromotion.set(null);
    if (!this.formValid()) {
      return;
    }

    const servicioId = this.formServicioId();
    const discountType = this.formDiscountType();
    if (servicioId == null || !discountType) return;

    const payload: PromotionCreate = {
      servicio: { id: servicioId },
      name: this.formName().trim(),
      discountType,
      discountValue: Number(this.formDiscountValue()),
      startDate: this.formStartDate(),
      endDate: this.formEndDate(),
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
        const message = extractApiErrorMessage(err, editing ? 'Ocurrió un error al actualizar la promoción.' : 'Ocurrió un error al crear la promoción.');

        if (isPermissionDeniedError(err, message)) {
          this.formError.set('No tienes permisos para esta acción: solo un Administrador puede crear, editar o eliminar promociones.');
          return;
        }

        this.formError.set(message);
        if (isOverlapConflictError(message)) {
          this.lookupConflictingPromotion(servicioId, payload.startDate, payload.endDate);
        }
      },
    });
  }

  /**
   * Best-effort ONLY: the backend's overlap message never names the conflict
   * (see `promotion-overlap.util.ts`), so this fetches the servicio's own
   * promotions and finds it client-side. If this lookup itself fails, the
   * verbatim backend message set in `onFormSubmit` above is left as-is —
   * this never replaces it with a second, less useful error.
   */
  private lookupConflictingPromotion(servicioId: number, startDate: string, endDate: string): void {
    const excludeId = this.editingItem()?.id ?? null;
    this.api.getAll(0, 100, servicioId).subscribe({
      next: (pageData) => {
        this.conflictingPromotion.set(findOverlappingPromotion(pageData.content, startDate, endDate, excludeId));
      },
      error: () => {
        // Swallowed on purpose — see docblock above.
      },
    });
  }

  // --- Eliminar ---
  openDeleteModal(item: Promotion): void {
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
        this.formError.set(this.describeWriteError(err, 'Ocurrió un error al eliminar la promoción.'));
      },
    });
  }
}
