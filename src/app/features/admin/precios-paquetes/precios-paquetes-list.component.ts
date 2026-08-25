import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ServicePackageApiService } from '../../../core/api/service-package-api.service';
import { ServicioApiService } from '../../../core/api/servicio-api.service';
import { fetchAllPages } from '../../../core/api/fetch-all-pages.util';
import { extractApiErrorMessage, isPermissionDeniedError } from '../metrics-shared/turn-status.util';
import type { Page, Servicio, ServicePackage, ServicePackageCreate } from '../../../core/models';

/** One line item row in the create/edit form. `rowId` is a LOCAL, stable identity generated when the row is added — never the array index — so `@for (... track row.rowId)` keeps each row's own data attached to it after another row is removed. */
interface PackageItemRow {
  rowId: number;
  servicioId: number | null;
  quantity: string;
}

/**
 * app-precios-paquetes-list — "Precios > Paquetes"
 * (`GET/POST/PUT/DELETE /api/packages`).
 *
 * `price` is set explicitly by the admin and is NEVER the sum of `items` —
 * the form and the table both show `price` (what the admin charges) AND
 * `itemsTotal`/`savings` (backend-computed, what the items would cost bought
 * separately) side by side. Neither value ever overwrites the other.
 */
@Component({
  selector: 'app-precios-paquetes-list',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './precios-paquetes-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreciosPaquetesListComponent implements OnInit {
  private readonly api = inject(ServicePackageApiService);
  private readonly servicioApi = inject(ServicioApiService);

  private nextRowId = 1;

  protected readonly data = signal<Page<ServicePackage> | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  // Catálogo de servicios (todas las páginas) para el <select> de cada línea del paquete.
  protected readonly serviciosCatalog = signal<Servicio[]>([]);
  protected readonly serviciosCatalogLoading = signal<boolean>(false);
  protected readonly serviciosCatalogError = signal<string | null>(null);
  protected readonly serviciosCatalogIncomplete = signal<boolean>(false);

  // Modal Crear / Editar
  protected readonly isFormModalOpen = signal<boolean>(false);
  protected readonly editingItem = signal<ServicePackage | null>(null);
  protected readonly formLoading = signal<boolean>(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly submitAttempted = signal<boolean>(false);

  protected readonly formName = signal<string>('');
  protected readonly formDescription = signal<string>('');
  protected readonly formPrice = signal<string>('');
  protected readonly formItems = signal<PackageItemRow[]>([]);

  protected readonly formValid = computed(() => {
    const name = this.formName().trim();
    const priceRaw = this.formPrice().trim();
    const price = Number(priceRaw);
    const items = this.formItems();

    if (!name) return false;
    if (priceRaw === '' || !Number.isFinite(price) || price < 0) return false;
    if (items.length === 0) return false;

    return items.every((row) => {
      const qty = Number(row.quantity);
      return row.servicioId != null && Number.isInteger(qty) && qty >= 1;
    });
  });

  /** Live estimate of what the current line items would cost bought separately today (net price × quantity, summed). Rows with no servicio selected yet contribute 0. */
  protected readonly formItemsTotalPreview = computed(() => {
    const catalog = this.serviciosCatalog();
    return this.formItems().reduce((sum, row) => {
      const servicio = catalog.find((s) => s.id === row.servicioId);
      if (!servicio) return sum;
      const net = servicio.netPrice ?? servicio.price - (servicio.discount ?? 0);
      const qty = Number(row.quantity) || 0;
      return sum + net * qty;
    }, 0);
  });

  /** Live estimate of the saving the draft package price represents vs. the items preview above. Never fed back into `formPrice`. */
  protected readonly formSavingsPreview = computed(() => this.formItemsTotalPreview() - (Number(this.formPrice()) || 0));

  /** Template-friendly validity check for the price field alone (Angular templates cannot call the global `Number(...)`). */
  protected readonly formPriceInvalid = computed(() => {
    const raw = this.formPrice().trim();
    const value = Number(raw);
    return raw === '' || !Number.isFinite(value) || value < 0;
  });

  // Modal Eliminar
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly deletingItem = signal<ServicePackage | null>(null);

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

    this.api.getAll(page, 10).subscribe({
      next: (pageData) => {
        this.data.set(pageData);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudieron cargar los paquetes.'));
        this.loading.set(false);
      },
    });
  }

  private describeWriteError(err: unknown, fallback: string): string {
    const message = extractApiErrorMessage(err, fallback);
    if (isPermissionDeniedError(err, message)) {
      return 'No tienes permisos para esta acción: solo un Administrador puede crear, editar o eliminar paquetes.';
    }
    return message;
  }

  // --- Crear / Editar ---
  openCreateModal(): void {
    this.editingItem.set(null);
    this.formName.set('');
    this.formDescription.set('');
    this.formPrice.set('');
    this.formItems.set([]);
    this.formError.set(null);
    this.submitAttempted.set(false);
    this.isFormModalOpen.set(true);
  }

  openEditModal(item: ServicePackage): void {
    this.editingItem.set(item);
    this.formName.set(item.name);
    this.formDescription.set(item.description ?? '');
    this.formPrice.set(String(item.price));
    this.formItems.set(
      item.items.map((row) => ({ rowId: this.nextRowId++, servicioId: row.servicio.id, quantity: String(row.quantity) })),
    );
    this.formError.set(null);
    this.submitAttempted.set(false);
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.editingItem.set(null);
  }

  onFormNameInput(event: Event): void {
    this.formName.set((event.target as HTMLInputElement).value);
  }

  onFormDescriptionInput(event: Event): void {
    this.formDescription.set((event.target as HTMLInputElement).value);
  }

  onFormPriceInput(event: Event): void {
    this.formPrice.set((event.target as HTMLInputElement).value);
  }

  addItemRow(): void {
    this.formItems.update((rows) => [
      ...rows,
      { rowId: this.nextRowId++, servicioId: this.serviciosCatalog()[0]?.id ?? null, quantity: '1' },
    ]);
  }

  removeItemRow(rowId: number): void {
    this.formItems.update((rows) => rows.filter((row) => row.rowId !== rowId));
  }

  onItemServicioChange(rowId: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const servicioId = value ? Number(value) : null;
    this.formItems.update((rows) => rows.map((row) => (row.rowId === rowId ? { ...row, servicioId } : row)));
  }

  onItemQuantityInput(rowId: number, event: Event): void {
    const quantity = (event.target as HTMLInputElement).value;
    this.formItems.update((rows) => rows.map((row) => (row.rowId === rowId ? { ...row, quantity } : row)));
  }

  onFormSubmit(): void {
    this.submitAttempted.set(true);
    if (!this.formValid()) {
      return;
    }

    const payload: ServicePackageCreate = {
      name: this.formName().trim(),
      description: this.formDescription().trim() || null,
      price: Number(this.formPrice()),
      items: this.formItems().map((row) => ({ servicio: { id: row.servicioId! }, quantity: Number(row.quantity) })),
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
          this.describeWriteError(err, editing ? 'Ocurrió un error al actualizar el paquete.' : 'Ocurrió un error al crear el paquete.'),
        );
      },
    });
  }

  // --- Eliminar ---
  openDeleteModal(item: ServicePackage): void {
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
        this.formError.set(this.describeWriteError(err, 'Ocurrió un error al eliminar el paquete.'));
      },
    });
  }
}
