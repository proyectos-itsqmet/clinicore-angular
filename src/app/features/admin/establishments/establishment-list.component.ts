import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import type { Establishment, Page } from '../../../core/models';

@Component({
  selector: 'app-establishment-list',
  imports: [RouterLink],
  templateUrl: './establishment-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstablishmentListComponent implements OnInit {
  private readonly api = inject(EstablishmentApiService);

  protected readonly data = signal<Page<Establishment> | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

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
        this.error.set('No se pudieron cargar los establecimientos.');
        this.loading.set(false);
      }
    });
  }

  deleteEstablishment(id: number): void {
    if (!confirm('¿Estás seguro de eliminar este establecimiento?')) {
      return;
    }

    this.loading.set(true);
    this.api.delete(id).subscribe({
      next: () => {
        // Recargar la página actual
        const currentPage = this.data()?.pageable?.pageNumber ?? 0;
        this.loadPage(currentPage);
      },
      error: () => {
        this.error.set('Error al eliminar el establecimiento.');
        this.loading.set(false);
      }
    });
  }
}
