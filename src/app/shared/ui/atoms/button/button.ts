import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Visual treatment of the button. `primary` carries the spinning border
 * beam from the design (see button.css `.beam`) and the CTA shadow.
 */
export type ButtonVariant = 'primary' | 'whatsapp' | 'glass' | 'ghost' | 'emergency';

export type ButtonSize = 'md' | 'lg';

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

  protected readonly rootClasses = computed(() => {
    const size = this.size();
    return [
      'relative inline-flex items-center justify-center gap-2.5 rounded-pill',
      'font-sans font-bold no-underline transition-all duration-150 ease-brand active:translate-y-px',
      size === 'lg' ? 'min-h-[58px] px-[30px] text-[17px]' : 'min-h-[52px] px-[26px] text-[16px]',
      this.fullWidth() ? 'w-full' : '',
      this.variantClasses(),
      this.disabled() ? 'pointer-events-none opacity-50' : '',
    ]
      .filter(Boolean)
      .join(' ');
  });

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
    }
  }
}
