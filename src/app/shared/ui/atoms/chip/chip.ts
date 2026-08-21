import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * app-chip — a selectable rectangular option (doctor, day, time slot).
 * Renders as a native `<button type="button">` with `aria-pressed` so
 * assistive tech announces the toggle state.
 *
 * The design board morphs the corner radius on selection (16px → pill,
 * `.chip`'s own `border-radius 300ms` transition) — that behaviour is
 * reproduced here through the `selected` input, not left to the caller.
 */
@Component({
  selector: 'app-chip',
  templateUrl: './chip.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Chip {
  readonly selected = input(false);
  readonly disabled = input(false);

  protected readonly rootClasses = computed(() => {
    return [
      'inline-flex min-h-[46px] items-center justify-center border-[1.5px] px-4',
      'font-sans text-[15px] font-semibold transition-all duration-300 ease-brand',
      this.selected() ? 'rounded-pill' : 'rounded-tile-lg',
      this.stateClasses(),
    ].join(' ');
  });

  private stateClasses(): string {
    if (this.disabled()) {
      return 'border-line bg-field text-ink-3 line-through';
    }
    if (this.selected()) {
      return 'border-blue bg-blue text-surface';
    }
    return 'border-line bg-surface text-ink-2';
  }
}
