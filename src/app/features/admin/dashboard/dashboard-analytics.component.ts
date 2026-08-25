import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { MetricsApiService } from '../../../core/api/metrics-api.service';
import { ServicioApiService } from '../../../core/api/servicio-api.service';
import type { Establishment, Servicio, TurnsSeries } from '../../../core/models';
import { extractApiErrorMessage } from '../metrics-shared/turn-status.util';
import { TurnsSeriesChartComponent } from '../metrics-shared/turns-series-chart.component';

/**
 * app-dashboard-analytics — "Dashboard > Analytics": the same
 * `GET /api/metrics/turns` series as `reportes/general`, but framed as an
 * interactive filterable dashboard (date range + establishment + service),
 * not a report. `stablishmentId`/`serviceId` are the reason this screen
 * exists separately from the plain system-wide report.
 */
@Component({
  selector: 'app-dashboard-analytics',
  imports: [FormsModule, TurnsSeriesChartComponent],
  templateUrl: './dashboard-analytics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardAnalyticsComponent implements OnInit {
  private readonly metricsApi = inject(MetricsApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly servicioApi = inject(ServicioApiService);

  protected readonly establishments = signal<Establishment[]>([]);
  protected readonly services = signal<Servicio[]>([]);

  // Blank by default: the FIRST request omits `from`/`to` entirely so the
  // server's documented default (a trailing 30-day window ending today)
  // applies. The resolved range is then read back from the response
  // (`series().from/to`) instead of guessed client-side — see
  // `TurnsSeriesDTO`'s doc comment in Backend_QMS.
  protected readonly rangeFrom = signal<string>('');
  protected readonly rangeTo = signal<string>('');
  protected readonly filterEstablishmentId = signal<number | null>(null);
  protected readonly filterServiceId = signal<number | null>(null);

  protected readonly series = signal<TurnsSeries | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly hasActiveFilters = computed(
    () =>
      this.rangeFrom() !== '' ||
      this.rangeTo() !== '' ||
      this.filterEstablishmentId() !== null ||
      this.filterServiceId() !== null,
  );

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadSeries();
  }

  private loadCatalogs(): void {
    // Secondary catalogs (populate the filter `<select>`s): a failure here
    // just falls back to "Todos" instead of blocking the primary series.
    this.establishmentApi.getAll(0, 100).subscribe({
      next: (page) => this.establishments.set(page.content ?? []),
      error: () => this.establishments.set([]),
    });
    this.servicioApi.getAll(0, 100).subscribe({
      next: (page) => this.services.set(page.content ?? []),
      error: () => this.services.set([]),
    });
  }

  loadSeries(): void {
    this.loading.set(true);
    this.error.set(null);

    this.metricsApi
      .getTurnsSeries({
        from: this.rangeFrom() || undefined,
        to: this.rangeTo() || undefined,
        stablishmentId: this.filterEstablishmentId() ?? undefined,
        serviceId: this.filterServiceId() ?? undefined,
      })
      .subscribe({
        next: (data) => {
          this.series.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(extractApiErrorMessage(err, 'No se pudo cargar la serie de turnos para el rango seleccionado.'));
          this.loading.set(false);
        },
      });
  }

  onRangeFromChange(value: string): void {
    this.rangeFrom.set(value);
    this.loadSeries();
  }

  onRangeToChange(value: string): void {
    this.rangeTo.set(value);
    this.loadSeries();
  }

  onEstablishmentFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const id = value ? Number(value) : null;
    this.filterEstablishmentId.set(id !== null && !isNaN(id) ? id : null);
    this.loadSeries();
  }

  onServiceFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const id = value ? Number(value) : null;
    this.filterServiceId.set(id !== null && !isNaN(id) ? id : null);
    this.loadSeries();
  }

  resetFilters(): void {
    this.rangeFrom.set('');
    this.rangeTo.set('');
    this.filterEstablishmentId.set(null);
    this.filterServiceId.set(null);
    this.loadSeries();
  }
}
