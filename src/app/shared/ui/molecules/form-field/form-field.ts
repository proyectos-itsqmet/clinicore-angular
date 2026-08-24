import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * app-form-field — label, control slot, and the one line of help or error text
 * under it. The shell only; the control itself is projected.
 *
 * WHY A SHELL AND NOT ONE COMPONENT PER CONTROL TYPE: what an input and a
 * select actually share is the label, the error line, the vertical rhythm and
 * the `for` / `aria-describedby` wiring — not the control. Duplicating that
 * across `app-input-field` and `app-select-field` is duplicating the part
 * where a11y bugs live, so it is declared once and both compose it.
 *
 * ERROR AND HINT ARE MUTUALLY EXCLUSIVE, error wins. Two lines of small print
 * under one field is where the user stops reading either, and the hint has
 * nothing to add once the field is wrong.
 *
 * NO `role="alert"` ON THE ERROR. The message appears on blur, and an alert
 * fires an interruption every time focus leaves a field — on a seven-field
 * form that is seven interruptions during normal typing. The control carries
 * `aria-invalid` + `aria-describedby` instead, which is what makes a screen
 * reader read the message when focus lands back on the field it belongs to.
 */
@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class FormField {
  readonly label = input.required<string>();
  /** Id of the projected control — the label's `for`. */
  readonly controlId = input.required<string>();
  /** Id the projected control points `aria-describedby` at. */
  readonly messageId = input.required<string>();
  /** Rendered in place of the hint when set. */
  readonly error = input<string | undefined>(undefined);
  readonly hint = input<string | undefined>(undefined);
}
