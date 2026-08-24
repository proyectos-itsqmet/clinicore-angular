import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import { Icon } from '../../atoms/icon/icon';

/** `md` fits a two-or-three field form; `lg` fits a two-column grid. */
export type ModalSize = 'md' | 'lg';

/**
 * app-modal — the panel's dialog shell: title, body slot, actions slot.
 *
 * IT IS A NATIVE `<dialog>` OPENED WITH `showModal()`, and that single decision
 * is most of this component. The browser then owns, for free and correctly:
 *
 *   - the focus trap, so Tab cannot walk out the back of the dialog;
 *   - the rest of the document going inert, so nothing behind is clickable;
 *   - Escape closing it;
 *   - focus RETURNING to whatever opened it when it closes;
 *   - the top layer, so it renders above every ancestor overflow clip, z-index
 *     and stacking context without a single `z-` utility.
 *
 * Hand-rolling that list is what this project calls wiring a pattern whole
 * ("DRAWER A11Y is wired whole, not half" — `admin-layout.ts`), and the nine
 * copy-pasted dialogs this component replaces wired it half: they declared
 * `role="dialog"` and `aria-modal="true"` and then shipped no Escape, no focus
 * management and no trap. `app-segmented`'s doc already states the rule that
 * breaks — half a pattern is worse than none.
 *
 * BACKDROP CLICK. `::backdrop` is not a child, so a click on it lands on the
 * `<dialog>` element itself, which is what `onDialogClick` tests. Tapping
 * outside to dismiss is the gesture people try before they look for the X — the
 * same reason the shell's drawer made its scrim a real button.
 *
 * `close` FIRES ONCE, from the dialog's own `close` event, whichever of the four
 * ways closed it (Escape, backdrop, the X, an action). The parent's `@if` then
 * destroys this component. Do not also emit from the X's handler: `closeDialog`
 * calls `close()` on the element, and that raises the event anyway.
 */
@Component({
  selector: 'app-modal',
  imports: [Icon],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Modal {
  readonly heading = input.required<string>();
  /** One line under the title. Also the dialog's `aria-describedby`. */
  readonly description = input<string | undefined>(undefined);
  readonly size = input<ModalSize>('md');

  readonly close = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /** Captured on open so teardown never has to reach through `viewChild`. */
  private element: HTMLDialogElement | null = null;
  private destroyed = false;

  protected readonly headingId = 'modal-heading';
  protected readonly descriptionId = 'modal-description';

  protected readonly panelClasses = computed(() => {
    return [
      'flex max-h-[calc(100dvh-2.5rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden',
      'rounded-card rounded-br-card-nub border border-line bg-surface shadow-lift-2',
      this.size() === 'lg' ? 'sm:w-[720px]' : 'sm:w-[520px]',
    ].join(' ');
  });

  constructor() {
    // `afterNextRender` and not an effect: `showModal()` needs the element in
    // the document, and it only ever runs in the browser — which is also what
    // keeps this safe on a prerendered route, where a `<dialog>` with no `open`
    // attribute simply renders nothing.
    afterNextRender(() => {
      this.element = this.dialog().nativeElement;
      this.element.showModal();
    });

    // The happy path destroys this component instead of closing it: a save
    // succeeds and the parent flips its `@if`. Ripping an OPEN dialog out of
    // the top layer drops focus on `<body>`, so it is closed properly first and
    // the browser hands focus back to whatever opened it. The guard is what
    // keeps the resulting `close` event from emitting an output mid-teardown.
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.element?.close();
    });
  }

  protected closeDialog(): void {
    this.element?.close();
  }

  protected onClose(): void {
    if (!this.destroyed) {
      this.close.emit();
    }
  }

  /** Only the backdrop can make the `<dialog>` element itself the target. */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.element) {
      this.closeDialog();
    }
  }
}
