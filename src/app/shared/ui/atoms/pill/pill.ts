import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * `tint` — cool fill, the default pill everywhere (specialty counts,
 *   prices, dates). `glass` — translucent, for pills sitting over the
 *   hero photo/dark nav. `ok` — success/confirmation tone. `gold` —
 *   warm band tone (matches the cream section). `plain` — neutral
 *   surface with a hairline border (review quotes, secondary meta).
 */
export type PillTone = 'tint' | 'glass' | 'ok' | 'gold' | 'plain';

/**
 * app-pill — the label capsule. Projects an optional `app-icon` first,
 * then its text content. Knows nothing about what the label means.
 */
@Component({
  selector: 'app-pill',
  templateUrl: './pill.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Pill {
  readonly tone = input<PillTone>('tint');

  protected readonly rootClasses = computed(() => {
    return [
      'inline-flex min-h-[44px] items-center gap-2 rounded-pill px-[18px]',
      'font-sans text-[15px] font-semibold',
      this.toneClasses(),
    ].join(' ');
  });

  private toneClasses(): string {
    switch (this.tone()) {
      case 'glass':
        return 'border border-surface/30 bg-surface/16 text-surface';
      case 'ok':
        return 'bg-ok/12 text-ok';
      case 'gold':
        return 'bg-cream text-gold-ink';
      case 'plain':
        return 'border border-line bg-surface text-ink-3';
      case 'tint':
      default:
        return 'bg-tint text-blue-text';
    }
  }
}
