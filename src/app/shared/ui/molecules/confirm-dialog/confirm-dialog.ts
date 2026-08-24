import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../../atoms/button/button';
import { Icon } from '../../atoms/icon/icon';
import { Modal } from '../modal/modal';

/**
 * app-confirm-dialog — "are you sure" for a destructive action, composing
 * `app-modal`.
 *
 * IT EXISTS BECAUSE THE PANEL ASKS THE SAME QUESTION THREE TIMES (delete a
 * sede, an operator, a service) and the answer has to look and behave
 * identically every time. Three hand-written copies is three chances for one of
 * them to make the destructive button the calm one.
 *
 * DESTRUCTIVE IS THE `emergency` BUTTON AND CANCEL IS `quiet`, never the other
 * way round and never both loud. And Cancel is FIRST in the DOM: on a phone the
 * actions stack, `flex-col-reverse` puts the confirm on top visually, and the
 * tab order still reaches the safe option before the irreversible one.
 *
 * `pending` disables both buttons rather than only the confirm. A cancel that
 * lands mid-request tears the dialog down while the response is still coming,
 * and the caller has one less state to reason about if it simply cannot happen.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Button, Icon, Modal],
  templateUrl: './confirm-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ConfirmDialog {
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Eliminar');
  readonly cancelLabel = input('Cancelar');
  /** Copy while the request is in flight. */
  readonly pendingLabel = input('Eliminando…');
  readonly pending = input(false);

  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
