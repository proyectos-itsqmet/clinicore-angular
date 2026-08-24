import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { switchMap } from 'rxjs';

import { FormField } from '../form-field/form-field';
import {
  nextFieldId,
  resolveFieldError,
  type FieldControl,
  type FieldMessages,
} from '../form-field/field-state';

export type InputFieldType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'date';

/**
 * app-input-field — a labelled text/number input bound to a reactive
 * `FormControl`, with its own error line.
 *
 * IT TAKES THE CONTROL, NOT A `ControlValueAccessor`. Writing a CVA here would
 * buy the caller `formControlName` and cost this component an entire indirection
 * layer plus a `touched` bridge it would have to re-implement. Handing it the
 * control directly is less code on both sides and keeps validity, touched state
 * and error copy resolving in one place.
 *
 * WHY THE `events` SUBSCRIPTION. `FormControl.touched` and `.errors` are plain
 * properties, so a `computed()` reading them never re-runs. `control.events`
 * emits on value, status, touched and pristine changes, which is exactly the
 * set that can change what the error line should say — including the
 * `markAllAsTouched()` a submit handler fires. Drop it and the form silently
 * stops reporting errors on submit, which is the failure mode you notice last.
 *
 * `switchMap` over the control input and not a plain `toSignal(control.events)`
 * because the control is an `input()` and could be swapped; the subscription
 * has to follow it.
 */
@Component({
  selector: 'app-input-field',
  imports: [FormField, ReactiveFormsModule],
  templateUrl: './input-field.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class InputField {
  readonly label = input.required<string>();
  readonly control = input.required<FieldControl>();
  readonly type = input<InputFieldType>('text');
  readonly placeholder = input<string | undefined>(undefined);
  readonly autocomplete = input<string | undefined>(undefined);
  readonly maxLength = input<number | undefined>(undefined);
  /** Native `step`/`min`, only meaningful for `type="number"`. */
  readonly step = input<string | undefined>(undefined);
  readonly min = input<string | undefined>(undefined);
  /** A short leading unit rendered inside the control, e.g. `'$'`. */
  readonly prefix = input<string | undefined>(undefined);
  readonly hint = input<string | undefined>(undefined);
  /** Validator key to copy, e.g. `{ pattern: 'Debe tener 10 dígitos.' }`. */
  readonly messages = input<FieldMessages>({});

  protected readonly controlId = nextFieldId('input');
  protected readonly messageId = `${this.controlId}-message`;

  private readonly controlEvent = toSignal(
    toObservable(this.control).pipe(switchMap((control) => control.events)),
    { initialValue: null },
  );

  protected readonly error = computed(() => {
    this.controlEvent();
    return resolveFieldError(this.control(), this.messages());
  });

  protected readonly inputClasses = computed(() => {
    return [
      'min-h-11 w-full rounded-tile-sm border bg-surface font-sans text-[14.5px] text-ink',
      'placeholder:text-ink-3 transition-colors duration-150 ease-brand',
      'disabled:cursor-not-allowed disabled:opacity-55',
      this.prefix() ? 'pl-8 pr-3.5' : 'px-3.5',
      this.error() ? 'border-emergency' : 'border-line',
    ].join(' ');
  });
}
