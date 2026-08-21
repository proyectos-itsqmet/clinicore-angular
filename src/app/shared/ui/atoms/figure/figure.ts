import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type FigureTone = 'ink' | 'gold' | 'ok' | 'surface';

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
      case 'gold':
        return 'text-gold';
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
