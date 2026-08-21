import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Insurers, StatItem, Stats } from '../../../../core/models';
import { Kicker } from '../../atoms/kicker/kicker';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { Marquee } from '../../molecules/marquee/marquee';
import { StatCard } from '../../molecules/stat-card/stat-card';
import type { ProgressRingColor } from '../../atoms/progress-ring/progress-ring';

/** Draw-in delays copied byte-for-byte from design/Main.dc.html's four `--d` values. */
const RING_DELAYS_MS = [1600, 1900, 2200, 2500] as const;

/** Bound to `app-stat-card`'s required input while its own `loading` skeleton is showing. */
const EMPTY_STAT: StatItem = {
  id: '',
  value: 0,
  label: '',
  sublabel: '',
  percent: 0,
};

/**
 * app-stats-band — the four ring counters plus the "Convenios con
 * seguros" marquee (design/Main.dc.html section 4 / Mobile.dc.html
 * "COUNTERS + CONVENIOS"). Composes `app-stat-card` for each counter
 * and `app-marquee` for the insurer ribbon; the disclaimer note below
 * the grid is static copy, not part of either model.
 *
 * `StatItem` has no `ringColor` field, so the ring tone is derived
 * from the shape of the data instead of a hardcoded position: the
 * model's own doc comment says `suffix` is "only present on the
 * percentage-shaped stat", which is exactly the one stat the boards
 * draw with the `ok` (green) ring — every other stat gets `blue`.
 *
 * KNOWN GAP (not fixed here, out of an organism's reach): `app-stat-card`
 * hardcodes its ring at 124px and its figure at 38px with no size
 * input, so it cannot shrink to the 96px ring / 28px figure Mobile.dc.html
 * draws — this band renders the desktop-scale ring at every viewport.
 * Flagged in the delivery report; fixing it means adding a size input
 * to the molecule, not something this organism should reach into.
 */
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

  /** Placeholder tile counts for the marquee skeleton — the real row's
   * length comes from data, so loading just fills a plausible strip. */
  protected readonly marqueeSkeletonMobile = [0, 1, 2, 3] as const;
  protected readonly marqueeSkeletonDesktop = [0, 1, 2, 3, 4, 5, 6] as const;

  /** Fixed placeholder count matching `jsons/landing/stats.json`'s 4 items. */
  protected readonly skeletonStats = [0, 1, 2, 3] as const;
  protected readonly emptyStat = EMPTY_STAT;
}
