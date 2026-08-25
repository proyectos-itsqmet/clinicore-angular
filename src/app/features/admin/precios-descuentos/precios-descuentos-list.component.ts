import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ServicioApiService } from '../../../core/api/servicio-api.service';
import { extractApiErrorMessage, isPermissionDeniedError } from '../metrics-shared/turn-status.util';
import { AuthService } from '../../../core/auth/auth.service';
import type { Page, Servicio } from '../../../core/models';

/**
 * app-precios-descuentos-list — "Precios > Descuentos"
 * (`GET /api/services`, `PUT /api/services/{id}/discount`).
 *
 * NOT a new entity: a purpose-built view/edit over `Servicio.discount`, the
 * SAME data `administracion/especialidades` and `precios/citas` already read
 * through `ServicioApiService`. The edit action calls the NARROW
 * `updateDiscount()` endpoint only — never the full `update()` — so this
 * screen can never accidentally overwrite a service's `name`/`price` just by
 * touching its discount.
 *
 * `Servicio.discount` is a FIXED CURRENCY AMOUNT, never a percentage. Every
 * rendering of it here (table cell, edit form, live preview) says so
 * explicitly and permanently: an admin typing "20" meaning "20%" would
 * otherwise give away $20 per consultation instead of $20 total.
 */
@Component({
  selector: 'app-precios-descuentos-list',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './precios-descuentos-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreciosDescuentosListComponent implements OnInit {
  private readonly api = inject(ServicioApiService);
  private readonly authService = inject(AuthService);

  protected readonly isAdminOrEmployee = computed(() => {
    const role = this.authService.currentUser()?.role;
    return role === 'ROLE_ADMIN' || role === 'ROLE_EMPLOYEE';
  });

  protected readonly data = signal<Page<Servicio> | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  // Modal Editar Descuento
  protected readonly isEditModalOpen = signal<boolean>(false);
  protected readonly editingItem = signal<Servicio | null>(null);
  protected readonly formLoading = signal<boolean>(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly submitAttempted = signal<boolean>(false);
  protected readonly formDiscount = signal<string>('');

  protected readonly formDiscountValid = computed(() => {
    const raw = this.formDiscount().trim();
    if (raw === '') return false;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0;
  });

  /** Live preview of the net price the CURRENT form value would produce, shown next to the field. */
  protected readonly formPreviewNetPrice = computed(() => {
    const item = this.editingItem();
    if (!item) return null;
    const raw = this.formDiscount().trim();
    const value = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(value)) return null;
    return item.price - value;
  });

  ngOnInit(): void {
    this.loadPage(0);
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
        this.error.set(extractApiErrorMessage(err, 'No se pudieron cargar los servicios.'));
        this.loading.set(false);
      },
    });
  }

  /** Net price after discount, preferring the backend-computed value when present. */
  protected netPrice(item: Servicio): number {
    return item.netPrice ?? item.price - (item.discount ?? 0);
  }

  private describeWriteError(err: unknown, fallback: string): string {
    const message = extractApiErrorMessage(err, fallback);
    if (isPermissionDeniedError(err, message)) {
      return 'No tienes permisos para esta acción: solo un Administrador puede editar el descuento de un servicio.';
    }
    return message;
  }

  openEditModal(item: Servicio): void {
    this.editingItem.set(item);
    this.formDiscount.set(String(item.discount ?? 0));
    this.formError.set(null);
    this.submitAttempted.set(false);
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingItem.set(null);
  }

  onFormDiscountInput(event: Event): void {
    this.formDiscount.set((event.target as HTMLInputElement).value);
  }

  onFormSubmit(): void {
    this.submitAttempted.set(true);
    if (!this.formDiscountValid()) {
      return;
    }

    const item = this.editingItem();
    if (!item) return;

    this.formLoading.set(true);
    this.formError.set(null);

    this.api.updateDiscount(item.id, Number(this.formDiscount())).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeEditModal();
        this.loadPage(this.data()?.number ?? 0);
      },
      error: (err) => {
        this.formLoading.set(false);
        this.formError.set(this.describeWriteError(err, 'Ocurrió un error al actualizar el descuento.'));
      },
    });
  }
}
