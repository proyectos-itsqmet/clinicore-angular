import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** design/Main.dc.html `.ring circle.p`: stroke-dasharray 653, r 104 — coupled, do not change one without the other. */
const CIRCUMFERENCE = 653;

export type ProgressRingColor = 'blue' | 'ok';

/**
 * app-progress-ring — the counter ring from the stats row. The circle
 * geometry (viewBox, r, stroke-width, -90deg rotation, dasharray 653)
 * is fixed by the design and reused as-is; only the dash offset and
 * the stroke color change per instance.
 *
 * The `@keyframes draw` definition and the reduced-motion fallback
 * (both selector-compatible with `.ring circle.p`) live globally in
 * shared/tokens/base.css. The applying rule — dasharray, starting
 * offset, the 1.7s timing and the `--d` delay — lives in this
 * component's own progress-ring.css, per that file's convention. This
 * component only sets the `--off` and `--d` custom properties.
 *
 * Place the figure (e.g. `<app-figure>`) as projected content; it is
 * centered over the ring.
 */
@Component({
  selector: 'app-progress-ring',
  templateUrl: './progress-ring.html',
  styleUrl: './progress-ring.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ProgressRing {
  readonly percent = input(0);
  readonly size = input(124);
  readonly color = input<ProgressRingColor>('blue');
  /** Animation delay before the draw-in starts, in milliseconds. */
  readonly delayMs = input(0);

  protected readonly offset = computed(() => {
    const clamped = Math.min(100, Math.max(0, this.percent()));
    return CIRCUMFERENCE * (1 - clamped / 100);
  });
}
