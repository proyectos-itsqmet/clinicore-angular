import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import type { FaqItem as FaqItemModel } from '../../../../core/models';
import { Card } from '../card/card';

let nextInstanceId = 0;

/**
 * app-faq-item — one accordion row (design/Main.dc.html section 12).
 *
 * Project note: the board's own runtime toggles this with a checked
 * checkbox + `:checked` CSS, which doesn't exist in Angular's world of
 * signals and structural control flow. This reimplements the same visual
 * contract (grid-template-rows 0fr → 1fr, the vertical stroke of the "+"
 * scaling to 0 to leave a "−") with a local `open` signal and a real
 * `<button>` carrying `aria-expanded` / `aria-controls`, so it's keyboard-
 * and screen-reader-operable without any hidden form control.
 *
 * State is local and independent per item, exactly as the project brief
 * asks — an organism wanting "only one open at a time" would need to lift
 * that policy itself; this molecule doesn't assume it.
 */
@Component({
  selector: 'app-faq-item',
  imports: [Card],
  templateUrl: './faq-item.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class FaqItemComponent {
  readonly item = input.required<FaqItemModel>();
  readonly defaultOpen = input(false);

  private readonly instanceId = nextInstanceId++;
  protected readonly panelId = computed(() => `faq-item-panel-${this.instanceId}`);

  /**
   * `linkedSignal`, not a `signal` seeded in the constructor: signal inputs are not
   * bound yet when the constructor runs, so `this.defaultOpen()` returned its own
   * `false` default there and `[defaultOpen]="$first"` never took effect. This reads
   * the bound value at binding time while staying locally writable for `toggle()`,
   * preserving the "state is local and independent per item" contract above.
   */
  protected readonly open = linkedSignal(() => this.defaultOpen());

  protected toggle(): void {
    this.open.update((value) => !value);
  }
}
