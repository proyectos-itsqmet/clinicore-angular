import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * `live` — the pulsing `--color-live` dot, the default everywhere in the
 * landing. `stale` — `--color-gold-deep` and NO pulse: the data behind it
 * stopped arriving.
 */
export type LiveDotTone = 'live' | 'stale';

/**
 * app-live-dot — the pulsing status dot (design/Main.dc.html `.dot`).
 * Purely decorative: it always sits next to a text label ("En vivo",
 * "Agenda abierta hoy", "Sin conexión") that carries the actual meaning, so
 * it is `aria-hidden` unconditionally.
 *
 * `size` exists because the waiting-room display is watched from across a
 * room: the landing's 9px dot is simply not visible on a TV, and it has to
 * scale with the screen, so that consumer passes a `rem` length. Every other
 * consumer gets the design's 9px by leaving it alone.
 *
 * `tone` exists because on that same screen the dot has to be able to say the
 * opposite of "live". Stopping the pulse is the load-bearing half — a dot that
 * keeps breathing while the feed is dead is a lie — and the color change is
 * what makes it noticeable from a distance. `--color-gold-deep` and not
 * `--color-emergency`: the emergency red measures 2.19:1 on the screen's
 * navy-deep field, which fails even the large-text bar, while gold-deep is the
 * system's own "gold on dark backgrounds" token at 6.54:1.
 */
@Component({
  selector: 'app-live-dot',
  templateUrl: './live-dot.html',
  styleUrl: './live-dot.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveDot {
  /** Any CSS length. The design's own value is the default. */
  readonly size = input('9px');
  readonly tone = input<LiveDotTone>('live');

  protected readonly rootClasses = computed(() => (this.tone() === 'stale' ? 'dot dot-stale' : 'dot'));
}
