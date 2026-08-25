import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MetricsApiService } from '../../../core/api/metrics-api.service';
import type { TurnsSeries } from '../../../core/models';
import {
  TURN_STATUS_BADGE_CLASS,
  TURN_STATUS_LABELS,
  TURN_STATUS_ORDER,
  extractApiErrorMessage,
} from '../metrics-shared/turn-status.util';
import { TurnsSeriesChartComponent } from '../metrics-shared/turns-series-chart.component';

interface StatusTotalRow {
  status: (typeof TURN_STATUS_ORDER)[number];
  label: string;
  badgeClass: string;
  total: number;
  /** Share of the grand total, 0–100. `0` (not `NaN`) when the range has no turns at all. */
  percent: number;
}

/**
 * app-reportes-general — "Reportes > General": the SAME `GET
 * /api/metrics/turns` series `dashboard/analytics` reads, framed as a
 * system-wide report instead of an interactive dashboard — no
 * establishment/service drill-down (see the endpoint table in the task:
 * this row lists no `stablishmentId`/`serviceId`), just a date range, a
 * status-totals table, and the same chart.
 */
@Component({
  selector: 'app-reportes-general',
  imports: [FormsModule, DecimalPipe, TurnsSeriesChartComponent],
  templateUrl: './reportes-general.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportesGeneralComponent implements OnInit {
  private readonly api = inject(MetricsApiService);

  protected readonly rangeFrom = signal<string>('');
  protected readonly rangeTo = signal<string>('');

  protected readonly series = signal<TurnsSeries | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly grandTotal = computed(() =>
    (this.series()?.days ?? []).reduce((sum, day) => sum + day.turns.total, 0),
  );

  protected readonly statusTotals = computed<StatusTotalRow[]>(() => {
    const days = this.series()?.days ?? [];
    const total = this.grandTotal();
    return TURN_STATUS_ORDER.map((status) => {
      const statusTotal = days.reduce((sum, day) => sum + (day.turns.byStatus[status] ?? 0), 0);
      return {
        status,
        label: TURN_STATUS_LABELS[status],
        badgeClass: TURN_STATUS_BADGE_CLASS[status],
        total: statusTotal,
        percent: total === 0 ? 0 : (statusTotal / total) * 100,
      };
    });
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    // No stablishmentId/serviceId here on purpose — this report is
    // system-wide by design, unlike dashboard/analytics which drills down.
    this.api.getTurnsSeries({ from: this.rangeFrom() || undefined, to: this.rangeTo() || undefined }).subscribe({
      next: (data) => {
        this.series.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudo generar el reporte general de turnos.'));
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
