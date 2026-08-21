import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * `ink` (default) · `gold` · `ok` · `surface` are the landing's four.
 *
 * `blue`, `ink-3` and `gold-ink` were added for the waiting-room display: the
 * turn number sits on a white panel where `--color-gold` measures 1.6:1 and is
 * unusable, the queue's consultorio column is secondary next to its ticket, and
 * the current row is a solid gold tile whose only legible ink is `--gold-ink`
 * (the pair theme.css declares as "ink on top of gold").
 */
export type FigureTone = 'ink' | 'ink-3' | 'gold' | 'gold-ink' | 'blue' | 'ok' | 'surface';

/**
 * app-figure — a display number (design `.fig`: Nunito 800, tabular
 * nums). Projects the main figure by default; project an element
 * with the `appFigureSuffix` attribute to add a unit at ~55% size on
 * the same baseline (e.g. `96` + `%` without the `%` overflowing a
 * progress ring).
 */
@Component({
  selector: 'app-figure',
  templateUrl: './figure.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Figure {
  /** Any CSS font-size length, e.g. '38px'. */
  readonly size = input<string>('40px');
  readonly tone = input<FigureTone>('ink');

  protected readonly suffixSize = computed(() => `calc(${this.size()} * 0.55)`);

  protected readonly toneClass = computed(() => {
    switch (this.tone()) {
      case 'ink-3':
        return 'text-ink-3';
      case 'gold':
        return 'text-gold';
      case 'gold-ink':
        return 'text-gold-ink';
      case 'blue':
        return 'text-blue';
      case 'ok':
        return 'text-ok';
      case 'surface':
        return 'text-surface';
      case 'ink':
      default:
        return 'text-ink';
    }
  });
}
