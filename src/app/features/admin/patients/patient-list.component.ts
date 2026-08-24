import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PatientApiService } from '../../../core/api/patient-api.service';
import type { Patient, Page } from '../../../core/models';

@Component({
  selector: 'app-patient-list',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './patient-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientListComponent implements OnInit {
  private readonly api = inject(PatientApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly data = signal<Page<Patient> | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly searchForm = this.fb.nonNullable.group({
    name: [''],
    ci: ['']
  });

  ngOnInit(): void {
    this.loadPage(0);
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    const { name, ci } = this.searchForm.getRawValue();

    this.api.getAll(name, ci, page, 10).subscribe({
      next: (pageData) => {
        this.data.set(pageData);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los pacientes.');
        this.loading.set(false);
      }
    });
  }

  onSearch(): void {
    this.loadPage(0);
  }

  onReset(): void {
    this.searchForm.reset({ name: '', ci: '' });
    this.loadPage(0);
  }
}
