import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';

@Component({
  selector: 'app-establishment-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './establishment-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstablishmentFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(EstablishmentApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    address: ['', Validators.required],
  });

  protected readonly isEdit = signal<boolean>(false);
  protected readonly establishmentId = signal<number | null>(null);
  protected readonly loading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      this.isEdit.set(true);
      this.establishmentId.set(Number(idParam));
      this.loadEstablishment(this.establishmentId()!);
    }
  }

  private loadEstablishment(id: number): void {
    this.loading.set(true);
    this.api.getById(id).subscribe({
      next: (data) => {
        this.form.patchValue({
          name: data.name,
          address: data.address
        });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar el establecimiento.');
        this.loading.set(false);
      }
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const payload = this.form.getRawValue();
    const request$ = this.isEdit() 
      ? this.api.update(this.establishmentId()!, payload)
      : this.api.create(payload);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/admin/administracion/establecimientos']);
      },
      error: () => {
        this.error.set('Ocurrió un error al guardar el establecimiento.');
        this.loading.set(false);
      }
    });
  }
}
