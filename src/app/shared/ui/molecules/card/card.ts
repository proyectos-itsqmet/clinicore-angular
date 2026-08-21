import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * `surface` — white, the default everywhere. `field` — the app background
 * tone, used e.g. by `app-faq-item` for its open state. `emergency` — red
 * fill and border with white text, the 24/7 tile in the task rail.
 */
export type CardTone = 'surface' | 'field' | 'emergency';

/** Stacking axis for the media slot relative to the content slot. */
export type CardLayout = 'column' | 'row';

/**
 * app-card — the universal surface of the design system (design/Main.dc.html
 * `.card`): surface background, hairline border, the signature asymmetric
 * corner (24/24/8/24, the bottom-right corner pinched to 8px), a resting
 * `shadow-lift-1`, and on hover — for pointers that can actually hover —
 * a `translateY(-6px)` lift into `shadow-lift-2` with any projected media
 * scaling to 1.06.
 *
 * Every other card-shaped molecule in the system composes this one instead
 * of redrawing the shape; do not hand-roll the signature corner elsewhere.
 *
 * Two projection slots: `[cardMedia]` for a photo/figure (framed, clipped,
 * and scaled on hover automatically — project a plain `<img>` or
 * `<app-photo-frame>`, no extra classes required) and the default slot for
 * everything else (wrapped in its own padded flex column).
 */
@Component({
  selector: 'app-card',
  imports: [NgTemplateOutlet],
  templateUrl: './card.html',
  styleUrl: './card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card {
  /** Set to `false` for cards that must never lift on hover (e.g. inside a marquee). */
  readonly interactive = input(true);
  /** Renders an `<a>` when set, otherwise a plain `<div>`. */
  readonly href = input<string | undefined>(undefined);
  /** CSS `padding` shorthand for the content slot's wrapper. Empty by default so media-led cards stay flush. */
  readonly padding = input<string>('0');
  readonly tone = input<CardTone>('surface');
  readonly layout = input<CardLayout>('column');

  protected readonly rootClasses = computed(() => {
    return [
      'card relative flex overflow-hidden rounded-card rounded-br-card-nub border no-underline shadow-lift-1',
      this.layout() === 'row' ? 'flex-row items-stretch' : 'flex-col',
      this.interactive() ? 'interactive' : '',
      this.toneClasses(),
    ]
      .filter(Boolean)
      .join(' ');
  });

  protected readonly contentClasses = computed(() => 'flex flex-1 flex-col min-w-0');

  private toneClasses(): string {
    switch (this.tone()) {
      case 'field':
        return 'border-line bg-field text-ink';
      case 'emergency':
        return 'border-emergency bg-emergency text-surface';
      case 'surface':
      default:
        return 'border-line bg-surface text-ink';
    }
  }
}
