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

  // ==========================================================================
  // Cifras agregadas de toda la red.
  //
  // Salen de la MISMA respuesta que ya alimenta la tabla. La tabla contesta
  // "cómo le fue a cada sede"; esto contesta "cómo le fue a la clínica", que
  // es la lectura que un gerente hace primero y que antes había que sacar
  // sumando columnas a ojo.
  // ==========================================================================

  protected readonly totalSlots = computed(() =>
    this.rows().reduce((sum, r) => sum + r.totalSlots, 0),
  );

  protected readonly occupiedSlots = computed(() =>
    this.rows().reduce((sum, r) => sum + r.occupiedSlots, 0),
  );

  protected readonly totalTurns = computed(() =>
    this.rows().reduce((sum, r) => sum + r.turns.total, 0),
  );

  /**
   * Ocupación de la RED: cupos ocupados sobre cupos totales.
   *
   * No es el promedio de los `occupancyRate` de cada sede. Promediar
   * porcentajes le da el mismo peso a una sede de 20 cupos que a una de 400,
   * así que una sede chica y vacía hundiría el número de toda la clínica.
   * Sumar los cupos primero y dividir después pondera solo.
   */
  protected readonly networkOccupancy = computed(() => {
    const total = this.totalSlots();
    return total === 0 ? 0 : (this.occupiedSlots() / total) * 100;
  });

  protected readonly networkOccupancyLabel = computed(() =>
    this.totalSlots() === 0 ? 'Sin cupos' : `${Math.round(this.networkOccupancy() * 10) / 10}%`,
  );

  /** La sede con más cupos ocupados. La que sostiene la operación. */
  protected readonly busiestSite = computed(() => {
    const rows = this.rows();
    if (rows.length === 0) return null;
    const top = rows.reduce((best, r) => (r.occupiedSlots > best.occupiedSlots ? r : best));
    return top.occupiedSlots === 0 ? null : top;
  });

  /**
   * Las sedes CON cupos configurados y la ocupación más baja.
   *
   * Filtra las que tienen `totalSlots === 0` a propósito: una sede sin cupos
   * cargados no está desaprovechada, está sin configurar, y mezclarlas
   * escondería el problema real detrás de un 0% que no significa lo mismo.
   */
  protected readonly underusedSites = computed(() =>
    this.rows()
      .filter((r) => r.hasSlots && r.occupancyRate < 0.5)
      .sort((a, b) => a.occupancyRate - b.occupancyRate)
      .slice(0, 3),
  );

  /** Sedes sin un solo cupo cargado: un problema de configuración, no de demanda. */
  protected readonly sitesWithoutSlots = computed(() => this.rows().filter((r) => !r.hasSlots));

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
