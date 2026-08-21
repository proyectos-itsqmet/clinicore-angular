import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { StatItem } from '../../../../core/models';
import { Card } from '../card/card';
import { ProgressRing, ProgressRingColor } from '../../atoms/progress-ring/progress-ring';
import { Figure } from '../../atoms/figure/figure';
import { Skeleton } from '../../atoms/skeleton/skeleton';

/**
 * app-stat-card — one tile of the counters row (design/Main.dc.html
 * section 4): a progress ring around a big figure, a title and a sublabel.
 * Composes `app-card` (for the shell), `app-progress-ring` and `app-figure`
 * (for the ring + number).
 */
@Component({
  selector: 'app-stat-card',
  imports: [Card, ProgressRing, Figure, Skeleton],
  templateUrl: './stat-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class StatCard {
  readonly stat = input.required<StatItem>();
  readonly ringColor = input<ProgressRingColor>('blue');
  /** Stagger the ring's draw-in animation across a row of stat cards. */
  readonly delayMs = input(0);
  readonly loading = input(false);
}
