import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MetricsApiService } from '../../../core/api/metrics-api.service';
import type { EstablishmentMetrics, EstablishmentsMetrics } from '../../../core/models';
import { extractApiErrorMessage, formatRatePercent } from '../metrics-shared/turn-status.util';

interface EstablishmentRow extends EstablishmentMetrics {
  /** `false` when `totalSlots` is 0 — "no cupos configurados", not "0% de ocupación". */
  hasSlots: boolean;
  occupancyLabel: string;
  occupancyPercent: number;
}

/**
 * app-metricas-establecimientos — "Métricas > Establecimientos":
 * `GET /api/metrics/establishments`, one row per stablishment (even ones
 * with zero activity in the period, per `EstablishmentsMetricsDTO`'s doc
 * comment), so a manager can spot an under-used site, not just rank busy
 * ones.
 */
@Component({
  selector: 'app-metricas-establecimientos',
  imports: [FormsModule],
  templateUrl: './metricas-establecimientos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricasEstablecimientosComponent implements OnInit {
  private readonly api = inject(MetricsApiService);

  protected readonly rangeFrom = signal<string>('');
  protected readonly rangeTo = signal<string>('');

  protected readonly data = signal<EstablishmentsMetrics | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly rows = computed<EstablishmentRow[]>(() => {
    const establishments = this.data()?.establishments ?? [];
    return establishments.map((item) => {
      const hasSlots = item.totalSlots > 0;
      return {
        ...item,
        hasSlots,
        occupancyLabel: formatRatePercent(item.occupancyRate, hasSlots, 'Sin cupos'),
        occupancyPercent: hasSlots ? item.occupancyRate * 100 : 0,
      };
    });
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getEstablishmentMetrics({ from: this.rangeFrom() || undefined, to: this.rangeTo() || undefined }).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudieron cargar las métricas de establecimientos.'));
        this.loading.set(false);
      },
    });
  }

  onRangeFromChange(value: string): void {
    this.rangeFrom.set(value);
    this.load();
  }

  onRangeToChange(value: string): void {
    this.rangeTo.set(value);
    this.load();
  }
}
