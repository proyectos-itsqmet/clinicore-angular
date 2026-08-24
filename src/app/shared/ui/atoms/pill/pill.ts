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
 * `md` is the standard 44px pill from the boards. `sm` is the 32px / 13px
 * in-card badge the boards also draw but that this atom had no way to express —
 * `molecules/README.md` flagged it as a gap in this atom rather than
 * hand-rolling a second, smaller pill next to it. This closes that gap.
 *
 * Shrinking below the 44px tap floor is legitimate here and only here: a pill
 * is a `<span>`, never a target. Anything clickable is an `app-button` or an
 * `app-chip`, and both keep the floor.
 */
export type PillSize = 'md' | 'sm';

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
  readonly size = input<PillSize>('md');

  protected readonly rootClasses = computed(() => {
    return [
      'inline-flex items-center rounded-pill font-sans font-semibold',
      this.sizeClasses(),
      this.toneClasses(),
    ].join(' ');
  });

  private sizeClasses(): string {
    return this.size() === 'sm'
      ? 'min-h-8 gap-1.5 px-[11px] text-[13px]'
      : 'min-h-[44px] gap-2 px-[18px] text-[15px]';
  }

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
