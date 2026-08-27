import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { SelectField, type SelectOption } from '../../../shared/ui/molecules/select-field/select-field';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DoctorApiService } from '../../../core/api/doctor-api.service';
import type { AdminDoctor, Page } from '../../../core/models';

@Component({
  selector: 'app-doctor-list',
  imports: [ReactiveFormsModule, RouterLink, SelectField],
  templateUrl: './doctor-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorListComponent implements OnInit {
  protected readonly GENDER_OPTIONS: readonly SelectOption[] = [
    { value: 'GENDER_MALE', label: 'Masculino' },
    { value: 'GENDER_FEMALE', label: 'Femenino' },
    { value: 'GENDER_OTHER', label: 'Otro' },
  ];

  private readonly api = inject(DoctorApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly data = signal<Page<AdminDoctor> | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly isModalOpen = signal<boolean>(false);
  protected readonly formLoading = signal<boolean>(false);
  
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    speciality: ['', Validators.required],
    gender: ['GENDER_MALE', Validators.required],
    ci: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]]
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
        this.error.set('No se pudieron cargar los doctores.');
        this.loading.set(false);
      }
    });
  }

  openCreateModal(): void {
    this.form.reset({ gender: 'GENDER_MALE' });
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
        alert('Ocurrió un error al guardar el doctor.');
        this.formLoading.set(false);
      }
    });
  }
}
