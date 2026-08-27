import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { MetricsApiService } from '../../../core/api/metrics-api.service';
import { ServicioApiService } from '../../../core/api/servicio-api.service';
import type { Establishment, Servicio, TurnsSeries } from '../../../core/models';
import {
  TURN_STATUS_BADGE_CLASS,
  TURN_STATUS_BAR_COLOR,
  TURN_STATUS_LABELS,
  TURN_STATUS_ORDER,
  extractApiErrorMessage,
  formatIsoDateEs,
} from '../metrics-shared/turn-status.util';
import { TurnsSeriesChartComponent } from '../metrics-shared/turns-series-chart.component';
import { SelectField, type SelectOption } from '../../../shared/ui/molecules/select-field/select-field';
import type { TurnStatus } from '../../../core/models';

/** Una fila del desglose por estado del período completo. */
interface PeriodStatusRow {
  readonly status: TurnStatus;
  readonly label: string;
  readonly badgeClass: string;
  readonly color: string;
  readonly count: number;
  readonly percent: number;
}

/** Un día de la semana, con su promedio de turnos. */
interface WeekdayRow {
  readonly label: string;
  readonly average: number;
  readonly percent: number;
}

/**
 * app-dashboard-analytics — "Dashboard > Analytics": the same
 * `GET /api/metrics/turns` series as `reportes/general`, but framed as an
 * interactive filterable dashboard (date range + establishment + service),
 * not a report. `stablishmentId`/`serviceId` are the reason this screen
 * exists separately from the plain system-wide report.
 */
@Component({
  selector: 'app-dashboard-analytics',
  imports: [FormsModule, TurnsSeriesChartComponent, SelectField],
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

  protected readonly formatIsoDateEs = formatIsoDateEs;

  protected readonly establishmentFilterOptions = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Todos' },
    ...this.establishments().map((e) => ({ value: String(e.id), label: e.name })),
  ]);

  protected readonly serviceFilterOptions = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Todos' },
    ...this.services().map((s) => ({ value: String(s.id), label: s.name })),
  ]);

  // ==========================================================================
  // Lecturas derivadas de la MISMA serie que ya dibuja el gráfico.
  //
  // Ni una sola de estas pide un endpoint nuevo: `TurnsSeries.days` trae el
  // desglose por estado de cada día, y todo lo de abajo es agregarlo de otra
  // forma. Esa es la razón de que existan — la página tenía un gráfico y nada
  // más, con los datos para media docena de lecturas más ya cargados y sin
  // usar.
  // ==========================================================================

  /** Turnos totales del período. */
  protected readonly periodTotal = computed(() =>
    (this.series()?.days ?? []).reduce((sum, d) => sum + d.turns.total, 0),
  );

  /** Cuántos días cubre el rango devuelto POR EL SERVIDOR, no el pedido. */
  protected readonly periodDays = computed(() => this.series()?.days.length ?? 0);

  /**
   * Promedio de turnos por día, con un decimal.
   *
   * Sobre los días del rango y no sobre los días CON turnos: un martes con
   * cero turnos es información sobre la demanda, no una fila faltante, y
   * excluirlo inflaría el promedio justo cuando la clínica está vacía.
   */
  protected readonly dailyAverage = computed(() => {
    const days = this.periodDays();
    return days === 0 ? 0 : Math.round((this.periodTotal() / days) * 10) / 10;
  });

  /** El día con más turnos del período. Null si no hay ninguno. */
  protected readonly busiestDay = computed(() => {
    const days = this.series()?.days ?? [];
    if (days.length === 0) return null;
    return days.reduce((best, d) => (d.turns.total > best.turns.total ? d : best));
  });

  /** Suma por estado a lo largo de todo el período. */
  private readonly periodByStatus = computed<Record<TurnStatus, number>>(() => {
    const totals = {} as Record<TurnStatus, number>;
    for (const status of TURN_STATUS_ORDER) totals[status] = 0;
    for (const day of this.series()?.days ?? []) {
      for (const status of TURN_STATUS_ORDER) {
        totals[status] += day.turns.byStatus[status] ?? 0;
      }
    }
    return totals;
  });

  /** El desglose por estado del período, listo para dibujar. */
  protected readonly periodStatusRows = computed<PeriodStatusRow[]>(() => {
    const totals = this.periodByStatus();
    const total = this.periodTotal();
    return TURN_STATUS_ORDER.map((status) => ({
      status,
      label: TURN_STATUS_LABELS[status],
      badgeClass: TURN_STATUS_BADGE_CLASS[status],
      color: TURN_STATUS_BAR_COLOR[status],
      count: totals[status],
      percent: total === 0 ? 0 : (totals[status] / total) * 100,
    }));
  });

  /** Porcentaje de turnos cancelados sobre el total del período. */
  protected readonly cancellationRate = computed(() => {
    const total = this.periodTotal();
    if (total === 0) return 0;
    return Math.round((this.periodByStatus()['TURN_CANCELLED'] / total) * 1000) / 10;
  });

  /** Porcentaje atendido: turnos que llegaron a TURN_TREATED. */
  protected readonly attendedRate = computed(() => {
    const total = this.periodTotal();
    if (total === 0) return 0;
    return Math.round((this.periodByStatus()['TURN_TREATED'] / total) * 1000) / 10;
  });

  /**
   * Promedio de turnos por día de la SEMANA.
   *
   * Promedio y no suma, porque un rango de 30 días no contiene la misma
   * cantidad de lunes que de martes: sumar haría que el día de arranque del
   * rango parezca el más cargado por un accidente del calendario.
   *
   * `new Date(iso + 'T00:00:00')` y no `new Date(iso)`: una fecha sola se
   * interpreta como UTC y en Ecuador (-05:00) cae en el día ANTERIOR, así que
   * todo el patrón semanal quedaba corrido un día.
   */
  protected readonly weekdayRows = computed<WeekdayRow[]>(() => {
    const labels = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const sums = new Array(7).fill(0);
    const counts = new Array(7).fill(0);

    for (const day of this.series()?.days ?? []) {
      const weekday = new Date(`${day.date}T00:00:00`).getDay();
      if (Number.isNaN(weekday)) continue;
      sums[weekday] += day.turns.total;
      counts[weekday] += 1;
    }

    const averages = sums.map((sum, i) => (counts[i] === 0 ? 0 : sum / counts[i]));
    const peak = Math.max(...averages, 0);

    // Lunes primero: la semana laboral de la clínica no arranca el domingo.
    return [1, 2, 3, 4, 5, 6, 0].map((i) => ({
      label: labels[i],
      average: Math.round(averages[i] * 10) / 10,
      percent: peak === 0 ? 0 : (averages[i] / peak) * 100,
    }));
  });

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

  onEstablishmentFilterChange(value: string): void {
    const id = value ? Number(value) : null;
    this.filterEstablishmentId.set(id !== null && !isNaN(id) ? id : null);
    this.loadSeries();
  }

  onServiceFilterChange(value: string): void {
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
