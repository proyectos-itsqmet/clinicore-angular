import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Skeleton, SkeletonVariant } from '../../atoms/skeleton/skeleton';

/**
 * app-skeleton-grid — repeats one `app-skeleton` shape `count` times across
 * a `columns`-wide grid with a given `gap`, so organisms don't hand-write
 * the same `@for` of placeholder shapes over and over. Exists purely to
 * reserve layout space while real cards load; the grid itself carries
 * `aria-busy="true"` (the individual skeletons stay `aria-hidden`, per
 * `app-skeleton`'s own contract).
 */
@Component({
  selector: 'app-skeleton-grid',
  imports: [Skeleton],
  templateUrl: './skeleton-grid.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SkeletonGrid {
  readonly count = input.required<number>();
  readonly columns = input(1);
  readonly gap = input('20px');
  readonly variant = input<SkeletonVariant>('block');
  readonly width = input<string>('100%');
  readonly height = input<string | undefined>(undefined);
  readonly radius = input<string | undefined>(undefined);

  protected readonly items = computed(() => Array.from({ length: Math.max(0, this.count()) }, (_, i) => i));
  protected readonly gridTemplateColumns = computed(() => `repeat(${Math.max(1, this.columns())}, minmax(0, 1fr))`);
}
