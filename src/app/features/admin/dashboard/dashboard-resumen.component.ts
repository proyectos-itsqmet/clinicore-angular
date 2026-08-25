import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { MetricsApiService } from '../../../core/api/metrics-api.service';
import type { MetricsSummary } from '../../../core/models';
import {
  TURN_STATUS_BADGE_CLASS,
  TURN_STATUS_BAR_COLOR,
  TURN_STATUS_LABELS,
  TURN_STATUS_ORDER,
  extractApiErrorMessage,
} from '../metrics-shared/turn-status.util';

interface SummaryStatusRow {
  status: (typeof TURN_STATUS_ORDER)[number];
  label: string;
  badgeClass: string;
  color: string;
  count: number;
  /** Share of today's total, 0–100. `0` (not `NaN`) when there are no turns today yet. */
  percent: number;
}

/**
 * app-dashboard-resumen — "Dashboard > Resumen general": the admin panel's
 * landing page (`ADMIN_DEFAULT_PATH`). One call to `GET /api/metrics/summary`
 * (`MetricsApiService.getSummary`): today's turns by status, plus the
 * current totals for every catalog resource. No filters — this is a
 * snapshot, not a period report (that's `dashboard/analytics`).
 */
@Component({
  selector: 'app-dashboard-resumen',
  templateUrl: './dashboard-resumen.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardResumenComponent implements OnInit {
  private readonly api = inject(MetricsApiService);

  protected readonly summary = signal<MetricsSummary | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly statusRows = computed<SummaryStatusRow[]>(() => {
    const data = this.summary();
    if (!data) {
      return [];
    }
    const total = data.turnsToday.total;
    return TURN_STATUS_ORDER.map((status) => {
      const count = data.turnsToday.byStatus[status] ?? 0;
      return {
        status,
        label: TURN_STATUS_LABELS[status],
        badgeClass: TURN_STATUS_BADGE_CLASS[status],
        color: TURN_STATUS_BAR_COLOR[status],
        count,
        percent: total === 0 ? 0 : (count / total) * 100,
      };
    });
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudo cargar el resumen general.'));
        this.loading.set(false);
      },
    });
  }
}
