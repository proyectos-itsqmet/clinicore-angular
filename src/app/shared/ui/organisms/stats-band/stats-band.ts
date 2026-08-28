import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Insurers, StatItem, Stats } from '../../../../core/models';
import { Kicker } from '../../atoms/kicker/kicker';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { Marquee } from '../../molecules/marquee/marquee';
import { StatCard } from '../../molecules/stat-card/stat-card';
import type { ProgressRingColor } from '../../atoms/progress-ring/progress-ring';

const RING_DELAYS_MS = [1600, 1900, 2200, 2500] as const;

const EMPTY_STAT: StatItem = {
  id: '',
  value: 0,
  label: '',
  sublabel: '',
  percent: 0,
};

@Component({
  selector: 'app-stats-band',
  imports: [Kicker, Skeleton, Marquee, StatCard],
  templateUrl: './stats-band.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block bg-field pt-11 pb-10 md:pt-21 md:pb-18' },
})
export class StatsBand {
  readonly stats = input.required<Stats>();
  readonly insurers = input.required<Insurers>();
  readonly loading = input(false);

  protected ringColorFor(stat: StatItem): ProgressRingColor {
    return stat.suffix ? 'ok' : 'blue';
  }

  protected ringDelayFor(index: number): number {
    return RING_DELAYS_MS[index] ?? RING_DELAYS_MS[RING_DELAYS_MS.length - 1];
  }

  protected readonly marqueeSkeletonMobile = [0, 1, 2, 3] as const;
  protected readonly marqueeSkeletonDesktop = [0, 1, 2, 3, 4, 5, 6] as const;

  protected readonly skeletonStats = [0, 1, 2, 3] as const;
  protected readonly emptyStat = EMPTY_STAT;
}
