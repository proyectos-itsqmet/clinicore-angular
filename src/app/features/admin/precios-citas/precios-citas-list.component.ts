import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Page, Servicio } from '../../../core/models';
import { ServicioApiService } from '../../../core/api/servicio-api.service';

/**
 * app-precios-citas-list — "Precios > Citas": a price-focused READ view over
 * the SAME `Servicio` data `administracion/especialidades` already lists and
 * edits (`GET /api/services`, through the same `ServicioApiService`). Not a
 * new entity, not a new API — the pricing team's table over one column subset
 * (price, discount, the final price after discount) of that data.
 *
 * No create/edit form here on purpose: mutation already lives at
 * `administracion/especialidades`, and duplicating it in a second screen
 * would mean two places that can drift on the same record. Each row instead
 * links back to its record there.
 */
@Component({
  selector: 'app-precios-citas-list',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './precios-citas-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreciosCitasListComponent implements OnInit {
  private readonly api = inject(ServicioApiService);

  protected readonly data = signal<Page<Servicio> | null>(null);
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
        this.error.set('No se pudieron cargar los precios de citas.');
        this.loading.set(false);
      },
    });
  }

  /** Net price after discount — the number `especialidades` never computes. */
  protected finalPrice(item: Servicio): number {
    return item.price - (item.discount ?? 0);
  }
}
