import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * `muted` — ink-3, the default used almost everywhere. `gold` —
 * gold-ink, for the warm/cream band. `accent` — blue-bright, for
 * kickers over the dark hero/CTA sections. `soft` — blue-soft, the
 * hero eyebrow tone (needs an `on-dark` ancestor for focus contrast
 * if the kicker itself ever becomes interactive content). `warn` —
 * gold-deep, the system's "gold on dark backgrounds" token, for a
 * caution label on a dark surface (`--color-emergency` cannot be used
 * there: it measures 2.19:1 on navy-deep and fails even the large-text
 * bar, while gold-deep measures 6.54:1).
 */
export type KickerTone = 'muted' | 'gold' | 'accent' | 'soft' | 'warn';

/**
 * app-kicker — the uppercase, letter-spaced label above section headings.
 *
 * `size` overrides ONLY the font size; the `.14em` tracking, the 700 weight
 * and the uppercase transform — the things that actually make a kicker a
 * kicker — always come from the `text-kicker` token. It exists for the
 * waiting-room display, which by definition has its own type scale (a 13px
 * label is unreadable from four metres away). Leave it unset and you get the
 * design system's 13px, which is what every landing consumer does.
 */
@Component({
  selector: 'app-kicker',
  templateUrl: './kicker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Kicker {
  readonly tone = input<KickerTone>('muted');
  /** Any CSS length, e.g. `'1.375rem'`. Unset keeps the `text-kicker` size. */
  readonly size = input<string | undefined>(undefined);

  protected readonly rootClasses = computed(() => {
    return `text-kicker font-sans uppercase ${this.toneClass()}`;
  });

  private toneClass(): string {
    switch (this.tone()) {
      case 'gold':
        return 'text-gold-ink';
      case 'accent':
        return 'text-blue-bright';
      case 'soft':
        return 'text-blue-soft';
      case 'warn':
        return 'text-gold-deep';
      case 'muted':
      default:
        return 'text-ink-3';
    }
  }
}
