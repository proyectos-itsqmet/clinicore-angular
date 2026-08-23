import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServicioApiService } from '../../../core/api/servicio-api.service';
import type { Servicio, Page } from '../../../core/models';

@Component({
  selector: 'app-specialty-list',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './specialty-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecialtyListComponent implements OnInit {
  private readonly api = inject(ServicioApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly data = signal<Page<Servicio> | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly isModalOpen = signal<boolean>(false);
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly currentSpecialtyId = signal<number | null>(null);
  
  protected readonly formLoading = signal<boolean>(false);
  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    discount: [0, Validators.min(0)]
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
      error: () => {
        this.error.set('No se pudieron cargar las especialidades.');
        this.loading.set(false);
      }
    });
  }

  openCreateModal(): void {
    this.currentSpecialtyId.set(null);
    this.form.reset({ price: 0, discount: 0 });
    this.isModalOpen.set(true);
  }

  openEditModal(specialty: Servicio): void {
    this.currentSpecialtyId.set(specialty.id);
    this.form.patchValue({
      name: specialty.name,
      price: specialty.price,
      discount: specialty.discount ?? 0
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.formLoading.set(true);
    const payload = this.form.getRawValue();
    const id = this.currentSpecialtyId();

    const request$ = id 
      ? this.api.update(id, payload)
      : this.api.create(payload);

    request$.subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeModal();
        const currentPage = this.data()?.pageable?.pageNumber ?? 0;
        this.loadPage(currentPage);
      },
      error: () => {
        alert('Ocurrió un error al guardar la especialidad.');
        this.formLoading.set(false);
      }
    });
  }

  openDeleteModal(id: number): void {
    this.currentSpecialtyId.set(id);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.currentSpecialtyId.set(null);
  }

  confirmDelete(): void {
    const id = this.currentSpecialtyId();
    if (!id) return;

    this.formLoading.set(true);
    this.api.delete(id).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeDeleteModal();
        const currentPage = this.data()?.pageable?.pageNumber ?? 0;
        this.loadPage(currentPage);
      },
      error: () => {
        alert('Error al eliminar la especialidad.');
        this.formLoading.set(false);
        this.closeDeleteModal();
      }
    });
  }
}
