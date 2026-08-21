import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type SkeletonVariant = 'text' | 'block' | 'circle' | 'pill';

/**
 * app-skeleton — the shimmering placeholder surface. Every organism
 * fed by an endpoint composes its own skeleton shape out of these
 * (see the project LEY: the skeleton must reserve the real geometry —
 * same height, same column count, same radius as the loaded content).
 *
 * Always `aria-hidden="true"`: the loading container itself must carry
 * `aria-busy="true"` so a screen reader doesn't announce empty boxes.
 */
@Component({
  selector: 'app-skeleton',
  templateUrl: './skeleton.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents', 'aria-hidden': 'true' },
})
export class Skeleton {
  readonly variant = input<SkeletonVariant>('block');
  /** Any CSS length, e.g. '100%' or '240px'. Ignored by `circle` (uses height). */
  readonly width = input<string>('100%');
  /** Any CSS length. Defaults to a sensible value per variant when omitted. */
  readonly height = input<string | undefined>(undefined);
  /** Number of stacked bars — only meaningful for the `text` variant. */
  readonly lines = input(1);
  /** Any CSS length. Ignored by `circle`/`pill`, which are always fully rounded. */
  readonly radius = input<string | undefined>(undefined);

  protected readonly resolvedHeight = computed(() => {
    if (this.height()) {
      return this.height() as string;
    }
    switch (this.variant()) {
      case 'text':
        return '14px';
      case 'pill':
        return '44px';
      case 'circle':
        return this.width();
      case 'block':
      default:
        return '160px';
    }
  });

  protected readonly resolvedRadius = computed(() => {
    if (this.variant() === 'circle' || this.variant() === 'pill') {
      return '9999px';
    }
    return this.radius() ?? (this.variant() === 'text' ? '4px' : '16px');
  });

  protected readonly lineArray = computed(() =>
    this.variant() === 'text' ? Array.from({ length: Math.max(1, this.lines()) }) : [0],
  );
}
