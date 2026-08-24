import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Icon, type IconName } from '../../atoms/icon/icon';

/** `ok` confirms an action landed, `error` says it did not, `info` neither. */
export type InlineAlertTone = 'ok' | 'error' | 'info';

/**
 * app-inline-alert — one line of feedback about something the user just did,
 * rendered in the page instead of on top of it.
 *
 * IT REPLACES `window.alert()`. The panel's CRUD sections shipped nine of them,
 * and every one is a modal the user cannot style, cannot dismiss with anything
 * but a click, cannot copy out of, and which freezes the tab while it is up. It
 * also lands OUTSIDE the accessibility tree the rest of the page belongs to.
 * A live region says the same sentence without any of that.
 *
 * `role` FOLLOWS THE TONE, and the distinction is not cosmetic: a failure has to
 * interrupt (`alert`, assertive) because the user is about to walk away
 * believing the save worked, while a success only has to be announced when
 * there is a gap (`status`, polite). Marking every message assertive trains
 * people to ignore all of them.
 *
 * Deliberately NOT a toast: this is not `app-error-state` either. That molecule
 * owns "the section could not load, here is a retry"; this owns "the thing you
 * just clicked worked, or did not".
 */
@Component({
  selector: 'app-inline-alert',
  imports: [Icon],
  templateUrl: './inline-alert.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class InlineAlert {
  readonly message = input.required<string>();
  readonly tone = input<InlineAlertTone>('info');
  /** Renders the dismiss button. The caller still owns clearing its own state. */
  readonly dismissible = input(true);

  readonly dismiss = output<void>();

  protected readonly role = computed(() => (this.tone() === 'error' ? 'alert' : 'status'));

  protected readonly icon = computed<IconName>(() => {
    switch (this.tone()) {
      case 'ok':
        return 'check';
      case 'error':
        return 'warning';
      case 'info':
      default:
        return 'document';
    }
  });

  protected readonly rootClasses = computed(() => {
    return [
      'flex w-full items-start gap-3 rounded-tile-lg border px-4 py-3',
      this.toneClasses(),
    ].join(' ');
  });

  private toneClasses(): string {
    switch (this.tone()) {
      case 'ok':
        return 'border-ok/25 bg-ok/8 text-ok';
      case 'error':
        return 'border-emergency/25 bg-emergency/8 text-emergency';
      case 'info':
      default:
        return 'border-blue-soft bg-tint text-blue-text';
    }
  }
}
