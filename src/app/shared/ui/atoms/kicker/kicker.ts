import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * `muted` — ink-3, the default used almost everywhere. `gold` —
 * gold-ink, for the warm/cream band. `accent` — blue-bright, for
 * kickers over the dark hero/CTA sections. `soft` — blue-soft, the
 * hero eyebrow tone (needs an `on-dark` ancestor for focus contrast
 * if the kicker itself ever becomes interactive content).
 */
export type KickerTone = 'muted' | 'gold' | 'accent' | 'soft';

/** app-kicker — the uppercase, letter-spaced label above section headings. */
@Component({
  selector: 'app-kicker',
  templateUrl: './kicker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Kicker {
  readonly tone = input<KickerTone>('muted');

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
      case 'muted':
      default:
        return 'text-ink-3';
    }
  }
}
