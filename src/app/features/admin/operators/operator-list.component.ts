import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OperatorApiService } from '../../../core/api/operator-api.service';
import type { Operator, Page } from '../../../core/models';

@Component({
  selector: 'app-operator-list',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './operator-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperatorListComponent implements OnInit {
  private readonly api = inject(OperatorApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly data = signal<Page<Operator> | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  // Modal de creación
  protected readonly isModalOpen = signal<boolean>(false);
  protected readonly formLoading = signal<boolean>(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    role: ['ROLE_EMPLOYEE', Validators.required]
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
        this.error.set('No se pudieron cargar los operadores.');
        this.loading.set(false);
      }
    });
  }

  openCreateModal(): void {
    this.form.reset({ role: 'ROLE_EMPLOYEE' });
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
        alert('Ocurrió un error al crear el operador.');
        this.formLoading.set(false);
      }
    });
  }
}
