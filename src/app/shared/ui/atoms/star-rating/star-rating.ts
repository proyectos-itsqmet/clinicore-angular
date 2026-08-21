import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

let nextInstanceId = 0;

/**
 * app-star-rating — a row of stars, gold-filled with the required
 * `star-ring` outline (gold on white alone measures 1.6:1 — the ring
 * brings it to 3.68:1, per Palette.dc.html). Supports fractional
 * values through a per-star gradient fill.
 *
 * `role="img"` + `aria-label` carry the value in words, because the
 * star shape alone is not accessible.
 */
@Component({
  selector: 'app-star-rating',
  templateUrl: './star-rating.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class StarRating {
  readonly value = input.required<number>();
  readonly max = input(5);
  readonly size = input(20);

  /** Unique per instance so multiple ratings on one page don't share <linearGradient> ids. */
  protected readonly instanceId = nextInstanceId++;

  protected readonly starIndexes = computed(() => Array.from({ length: Math.max(0, this.max()) }, (_, i) => i));

  protected readonly ariaLabel = computed(() => `${this.value().toFixed(1)} de ${this.max()} estrellas`);

  protected fraction(index: number): number {
    return Math.min(1, Math.max(0, this.value() - index));
  }

  protected gradientId(index: number): string {
    return `star-rating-${this.instanceId}-${index}`;
  }
}
