import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Visual treatment of the button. `primary` carries the spinning border
 * beam from the design (see button.css `.beam`) and the CTA shadow.
 *
 * `quiet` and `danger` are the admin panel's two dense-chrome treatments: a
 * table row with three actions cannot carry three bordered buttons, and the
 * destructive one has to read as destructive BEFORE it is clicked. `danger` is
 * not a duplicate of `emergency` — `emergency` is the solid red 24/7 CTA on the
 * landing, this is its quiet twin for a row action.
 */
export type ButtonVariant =
  'primary' | 'whatsapp' | 'glass' | 'ghost' | 'emergency' | 'quiet' | 'danger';

/**
 * `sm` exists for the admin panel's tables and panel headers, where a 52px
 * control inside a 56px row leaves no air. It is 44px — the project LEY's tap
 * target floor — and not one pixel less, which is exactly why it is a named
 * size here instead of a caller shrinking the atom with utilities.
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * app-button — the single call-to-action control for the whole design
 * system. Renders an `<a>` when `href` is set, otherwise a `<button>`.
 *
 * Knows nothing about what it links to or submits — appearance and
 * content arrive entirely through inputs and projected content.
 */
@Component({
  selector: 'app-button',
  imports: [NgTemplateOutlet],
  templateUrl: './button.html',
  styleUrl: './button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly href = input<string | undefined>(undefined);
  readonly disabled = input(false);
  readonly fullWidth = input(false);
  /** Native `type` attribute, only relevant when rendered as a `<button>`. */
  readonly type = input<'button' | 'submit'>('button');
  /**
   * Native `form` attribute — the id of the `<form>` this button submits.
   *
   * Needed because `app-modal` projects the form into its scrolling body and
   * the actions into its fixed footer, so the submit button is not a descendant
   * of the form it belongs to. Without it the only options are a click handler
   * (which kills submit-on-Enter, since a form with no submit button inside it
   * has no implicit submission) or putting the buttons back inside the
   * scrolling region, where "Guardar" disappears below the fold on a phone.
   */
  readonly form = input<string | undefined>(undefined);

  protected readonly rootClasses = computed(() => {
    return [
      'relative inline-flex items-center justify-center gap-2.5 rounded-pill',
      'font-sans font-bold no-underline transition-all duration-150 ease-brand active:translate-y-px',
      this.sizeClasses(),
      this.fullWidth() ? 'w-full' : '',
      this.variantClasses(),
      this.disabled() ? 'pointer-events-none opacity-50' : '',
    ]
      .filter(Boolean)
      .join(' ');
  });

  private sizeClasses(): string {
    switch (this.size()) {
      case 'sm':
        return 'min-h-11 px-[18px] text-[14.5px]';
      case 'lg':
        return 'min-h-[58px] px-[30px] text-[17px]';
      case 'md':
      default:
        return 'min-h-[52px] px-[26px] text-[16px]';
    }
  }

  private variantClasses(): string {
    switch (this.variant()) {
      case 'primary':
        return 'beam text-surface shadow-cta';
      case 'whatsapp':
        return 'bg-wa text-ink';
      case 'glass':
        return 'border border-surface/34 bg-surface/18 text-surface backdrop-blur-[18px] backdrop-saturate-[1.8]';
      case 'ghost':
        return 'border-2 border-blue bg-transparent text-blue-text';
      case 'emergency':
        return 'bg-emergency text-surface';
      // Tailwind v4 already wraps `hover:` in `@media (hover: hover)`, so these
      // two don't need the manual gate `card.css` and `admin-nav.css` write by
      // hand — those files emit raw CSS, where the variant isn't available.
      case 'quiet':
        return 'bg-transparent text-ink-2 hover:bg-field hover:text-ink';
      case 'danger':
        return 'bg-transparent text-emergency hover:bg-emergency/10';
    }
  }
}
