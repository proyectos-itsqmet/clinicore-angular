import { Injectable, signal } from '@angular/core';

/**
 * Whether the assistant panel is open — owned here rather than inside
 * `ChatWidget`.
 *
 * ## Why the state left the component
 *
 * The widget used to hold its own `open` signal and its own `toggle()`, both
 * `protected`, which is correct for a component nothing else drives. Then the
 * hero got a "Contáctanos" button that has to open the same panel, and a
 * `protected` signal has no way to say yes.
 *
 * The alternatives were worse. Making the widget's members public and reaching
 * for it with `viewChild` from `LandingPage` would put the hero's CTA on a
 * chain through two ancestors, and would break the moment the widget moved or
 * a second entry point appeared. Passing an `input()` down would mean the page
 * owns a piece of the widget's state for no reason of its own.
 *
 * A root-provided signal is the smallest thing that lets any number of
 * unrelated entry points — the floating launcher, the hero CTA, a future link
 * in the footer — say "open the assistant" without knowing where the panel is
 * rendered or that the others exist.
 */
@Injectable({ providedIn: 'root' })
export class ChatPanelService {
  private readonly openState = signal(false);

  /** Read-only view for the widget that actually draws the panel. */
  readonly isOpen = this.openState.asReadonly();

  open(): void {
    this.openState.set(true);
  }

  close(): void {
    this.openState.set(false);
  }

  toggle(): void {
    this.openState.update((isOpen) => !isOpen);
  }
}
