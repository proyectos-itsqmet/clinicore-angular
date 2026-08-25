import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { DayTurns, TurnStatus } from '../../../core/models';
import {
  TURN_STATUS_BADGE_CLASS,
  TURN_STATUS_BAR_COLOR,
  TURN_STATUS_LABELS,
  TURN_STATUS_ORDER,
  formatIsoDateEs,
} from './turn-status.util';

interface ChartSegment {
  status: TurnStatus;
  label: string;
  value: number;
  color: string;
  y: number;
  height: number;
}

interface ChartBar {
  date: string;
  label: string;
  total: number;
  x: number;
  width: number;
  segments: ChartSegment[];
  showTick: boolean;
}

interface LegendEntry {
  status: TurnStatus;
  label: string;
  badgeClass: string;
  total: number;
}

/** Caps how many date labels can show under the x-axis, regardless of range length, so a 90-day range doesn't smear into unreadable text. */
const MAX_VISIBLE_TICKS = 8;

/**
 * app-turns-series-chart — the stacked-by-status daily bar chart shared by
 * `dashboard/analytics` and `reportes/general` (both consume `GET
 * /api/metrics/turns`, the same dense, zero-filled `DayTurns[]`).
 *
 * Hand-rolled SVG, no charting library: `viewBox="0 0 100 100"` with
 * `preserveAspectRatio="none"` places every bar in PERCENTAGE space
 * regardless of how many days are in range, then stretches to whatever
 * pixel box the host's fixed-height container gives it.
 *
 * Every status carries a text legend entry with its running total for the
 * whole range — colour never carries meaning alone here.
 */
@Component({
  selector: 'app-turns-series-chart',
  templateUrl: './turns-series-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnsSeriesChartComponent {
  readonly days = input<DayTurns[]>([]);

  protected readonly maxTotal = computed(() => {
    const totals = this.days().map((day) => day.turns.total);
    return Math.max(1, 0, ...totals);
  });

  protected readonly bars = computed<ChartBar[]>(() => {
    const days = this.days();
    const count = days.length;
    if (count === 0) {
      return [];
    }

    const slotWidth = 100 / count;
    const barWidth = slotWidth * 0.62;
    const tickStep = Math.max(1, Math.ceil(count / MAX_VISIBLE_TICKS));
    const max = this.maxTotal();

    return days.map((day, index) => {
      let running = 0;
      const segments: ChartSegment[] = TURN_STATUS_ORDER.map((status) => {
        const value = day.turns.byStatus[status] ?? 0;
        const height = (value / max) * 100;
        const y = 100 - running - height;
        running += height;
        return { status, label: TURN_STATUS_LABELS[status], value, color: TURN_STATUS_BAR_COLOR[status], y, height };
      });

      return {
        date: day.date,
        label: formatIsoDateEs(day.date),
        total: day.turns.total,
        x: index * slotWidth + (slotWidth - barWidth) / 2,
        width: barWidth,
        segments,
        showTick: index % tickStep === 0 || index === count - 1,
      };
    });
  });

  protected readonly legend = computed<LegendEntry[]>(() => {
    const days = this.days();
    return TURN_STATUS_ORDER.map((status) => ({
      status,
      label: TURN_STATUS_LABELS[status],
      badgeClass: TURN_STATUS_BADGE_CLASS[status],
      total: days.reduce((sum, day) => sum + (day.turns.byStatus[status] ?? 0), 0),
    }));
  });

  protected readonly grandTotal = computed(() => this.legend().reduce((sum, entry) => sum + entry.total, 0));

  protected readonly rangeLabel = computed(() => {
    const days = this.days();
    if (days.length === 0) {
      return '';
    }
    const first = formatIsoDateEs(days[0].date);
    const last = formatIsoDateEs(days[days.length - 1].date);
    return first === last ? first : `${first} → ${last}`;
  });
}
