import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';

import { BlockReasonApiService } from '../../../core/api/block-reason-api.service';
import { extractApiErrorMessage } from '../metrics-shared/turn-status.util';
import type { BlockReason, Page } from '../../../core/models';

/**
 * app-block-reason-list — "Bloqueo de citas > Motivos": CRUD over the small
 * `BlockReason` catalog (`GET/POST/PUT/DELETE /api/block-reasons`) that
 * `Holiday` and `TimeOff` both reference. No `createdAt` column: unlike the
 * `BlockReason` entity, `BlockReasonDTO` never carries it on the wire (see
 * `core/models/block-reason.model.ts`).
 */
@Component({
  selector: 'app-block-reason-list',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './block-reason-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockReasonListComponent implements OnInit {
  private readonly api = inject(BlockReasonApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly data = signal<Page<BlockReason> | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly searchDescription = signal<string>('');
  private appliedDescription: string | undefined;

  protected readonly isCreateModalOpen = signal<boolean>(false);
  protected readonly isEditModalOpen = signal<boolean>(false);
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly formLoading = signal<boolean>(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly editingItem = signal<BlockReason | null>(null);
  protected readonly deletingItem = signal<BlockReason | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    description: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadPage(0);
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getAll(page, 10, this.appliedDescription).subscribe({
      next: (pageData) => {
        this.data.set(pageData);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudieron cargar los motivos.'));
        this.loading.set(false);
      },
    });
  }

  search(): void {
    this.appliedDescription = this.searchDescription().trim() || undefined;
    this.loadPage(0);
  }

  resetSearch(): void {
    this.searchDescription.set('');
    this.appliedDescription = undefined;
    this.loadPage(0);
  }

  // --- Modal Crear ---
  openCreateModal(): void {
    this.form.reset({ description: '' });
    this.formError.set(null);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  onCreateSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.formLoading.set(true);
    this.formError.set(null);
    const payload = this.form.getRawValue();

    this.api.create(payload).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeCreateModal();
        this.loadPage(this.data()?.number ?? 0);
      },
      error: (err) => {
        this.formLoading.set(false);
        this.formError.set(extractApiErrorMessage(err, 'Ocurrió un error al crear el motivo.'));
      },
    });
  }

  // --- Modal Editar ---
  openEditModal(item: BlockReason): void {
    this.editingItem.set(item);
    this.form.reset({ description: item.description });
    this.formError.set(null);
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingItem.set(null);
  }

  onEditSubmit(): void {
    const item = this.editingItem();
    if (!item || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.formLoading.set(true);
    this.formError.set(null);
    const payload = this.form.getRawValue();

    this.api.update(item.id, payload).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeEditModal();
        this.loadPage(this.data()?.number ?? 0);
      },
      error: (err) => {
        this.formLoading.set(false);
        this.formError.set(extractApiErrorMessage(err, 'Ocurrió un error al actualizar el motivo.'));
      },
    });
  }

  // --- Modal Eliminar ---
  openDeleteModal(item: BlockReason): void {
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
        // No se cierra el modal: el admin debe leer por qué no se pudo eliminar
        // (p. ej. el motivo sigue referenciado por un feriado o una ausencia).
        this.formError.set(extractApiErrorMessage(err, 'Ocurrió un error al eliminar el motivo.'));
      },
    });
  }
}
