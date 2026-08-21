import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../atoms/button/button';

/**
 * app-error-state — the discreet, retryable failure state for any section
 * fed by a remote resource. Unlike `app-skeleton`, it doesn't know about
 * loading geometry: it exists purely so a failed fetch never leaves a
 * section stuck on its own skeleton forever (see the project LEY — "un
 * skeleton eterno es un bug").
 *
 * Only `features/landing` (or any future feature composing it) reads
 * `error()`/calls `reload()` on the underlying resource; this molecule
 * only surfaces the message it's given and emits `retry` on click.
 */
@Component({
  selector: 'app-error-state',
  imports: [Button],
  templateUrl: './error-state.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ErrorState {
  readonly message = input('No pudimos cargar esta información.');
  /** Any CSS length. Lets a caller reserve roughly the space the real section would take. */
  readonly minHeight = input('220px');

  readonly retry = output<void>();
}
