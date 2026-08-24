import type { FormControl } from '@angular/forms';

/**
 * Every control the panel's forms bind. Reactive forms are invariant in their
 * value type, so a plain `FormControl<string | number>` would reject both of
 * the shapes actually in use — the union accepts them and still assigns
 * cleanly to the `formControl` directive's own `FormControl<any>`.
 */
export type FieldControl = FormControl<string> | FormControl<number>;

/** Validator key (`required`, `pattern`, `min`, ...) to the copy shown for it. */
export type FieldMessages = Readonly<Record<string, string>>;

/**
 * Copy for the two validators every form in the panel uses. Generic UI copy,
 * not domain copy, which is the line `molecules/README.md` draws: "el nombre es
 * requerido" names a field and belongs to the feature, "este campo es
 * obligatorio" does not and belongs here. Anything more specific arrives
 * through a field's own `messages`.
 */
const DEFAULT_MESSAGES: FieldMessages = {
  required: 'Este campo es obligatorio.',
  email: 'Ingresa un correo electrónico válido.',
};

/**
 * Shown when a control is invalid under a validator nobody wrote copy for.
 * Deliberately not silence: an input that is rejected without saying so is the
 * worst version of this component.
 */
const FALLBACK_MESSAGE = 'Revisa este campo.';

/**
 * Ids for the label's `for` and the error's `aria-describedby`.
 *
 * A MODULE COUNTER, not `randomUUID()`, and that is load-bearing: `/login` is
 * prerendered (`app.routes.server.ts` only carves out `/sala` and `/admin`), so
 * the server render and the hydrating client render have to agree. A counter
 * agrees — same module, same component order, same numbers. A random id does
 * not, and hands the browser a `<label for>` pointing at nothing.
 */
let sequence = 0;

export function nextFieldId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

/**
 * The message to show under a control, or `undefined` while it should stay
 * quiet.
 *
 * ONLY AFTER `touched`. Painting an error on a field the user has not reached
 * yet turns an empty form into a wall of red on first paint, and the panel's
 * submit handlers already call `markAllAsTouched()` so nothing stays hidden at
 * the moment it matters.
 *
 * This function is NOT reactive on its own — `FormControl.touched` is a plain
 * property. Callers re-run it from a `computed()` that reads a signal fed by
 * `control.events`, which emits on both status and touched changes.
 */
export function resolveFieldError(
  control: FieldControl,
  messages: FieldMessages,
): string | undefined {
  if (!control.touched || control.valid) {
    return undefined;
  }

  const errors = control.errors;
  if (!errors) {
    return undefined;
  }

  for (const key of Object.keys(errors)) {
    const message = messages[key] ?? DEFAULT_MESSAGES[key];
    if (message) {
      return message;
    }
  }

  return FALLBACK_MESSAGE;
}
