import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { switchMap } from 'rxjs';

import { Icon } from '../../atoms/icon/icon';
import { FormField } from '../form-field/form-field';
import {
  nextFieldId,
  resolveFieldError,
  type FieldControl,
  type FieldMessages,
} from '../form-field/field-state';

/** One `<option>`. `value` is bound as-is, so it keeps its number or string type. */
export interface SelectOption {
  readonly value: string | number;
  readonly label: string;
}

/**
 * app-select-field — a labelled `<select>` bound to a reactive `FormControl`.
 * The input sibling of `app-input-field`; read that component's doc for why it
 * takes the control directly and why it subscribes to `control.events`.
 *
 * THE NATIVE ARROW IS REPLACED, THE NATIVE SELECT IS NOT. `appearance-none` plus
 * the system's own `chevron` is what makes this field match the shell's sede
 * switcher instead of rendering an OS-flavoured triangle next to it — but the
 * element underneath is still a `<select>`, so the phone still opens its native
 * picker and the keyboard still types-to-select. A listbox rebuilt out of divs
 * would lose both.
 *
 * `placeholder` renders as a DISABLED first option, not as a selectable one:
 * "Selecciona un servicio" is a prompt, and a form that lets you submit the
 * prompt as an answer is a form with a validator it did not need.
 */
@Component({
  selector: 'app-select-field',
  imports: [FormField, Icon, ReactiveFormsModule],
  templateUrl: './select-field.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SelectField {
  readonly label = input.required<string>();
  readonly control = input.required<FieldControl>();
  readonly options = input.required<readonly SelectOption[]>();
  /** Disabled first option, shown while nothing valid is picked. */
  readonly placeholder = input<string | undefined>(undefined);
  /** Value the placeholder option carries — the "nothing picked yet" sentinel. */
  readonly placeholderValue = input<string | number>(0);
  readonly hint = input<string | undefined>(undefined);
  readonly loading = input(false);
  readonly messages = input<FieldMessages>({});

  protected readonly controlId = nextFieldId('select');
  protected readonly messageId = `${this.controlId}-message`;

  private readonly controlEvent = toSignal(
    toObservable(this.control).pipe(switchMap((control) => control.events)),
    { initialValue: null },
  );

  protected readonly error = computed(() => {
    this.controlEvent();
    return resolveFieldError(this.control(), this.messages());
  });

  protected readonly selectClasses = computed(() => {
    return [
      'min-h-11 w-full appearance-none rounded-tile-sm border bg-surface pl-3.5 pr-10',
      'font-sans text-[14.5px] text-ink transition-colors duration-150 ease-brand',
      'disabled:cursor-not-allowed disabled:opacity-55',
      this.error() ? 'border-emergency' : 'border-line',
    ].join(' ');
  });
}
