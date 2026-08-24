import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ServicioApiService } from '../../../core/api/servicio-api.service';
import type { Servicio, Page } from '../../../core/models';

@Component({
  selector: 'app-specialty-list',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DecimalPipe],
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
        this.error.set('No se pudieron cargar los servicios.');
        this.loading.set(false);
      }
    });
  }

  openCreateModal(): void {
    this.form.reset({ price: 0, discount: 0 });
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

    this.api.create(payload).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeModal();
        const currentPage = this.data()?.pageable?.pageNumber ?? 0;
        this.loadPage(currentPage);
      },
      error: () => {
        alert('Ocurrió un error al crear el servicio.');
        this.formLoading.set(false);
      }
    });
  }
}
