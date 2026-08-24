import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * app-list-row — one entry in a panel's divided list: an optional leading
 * control, a title with an optional second line, and an optional trailing
 * figure or badge.
 *
 * The vertical twin of a table row, for the places a table is the wrong shape —
 * a sede attached to a doctor, a service with its price, a checkbox list inside
 * a dialog. Three uses in the panel today and all three were hand-written with
 * different paddings, which is exactly the drift this exists to stop.
 *
 * IT IS NOT INTERACTIVE ON ITS OWN and does not try to be. The one place a row
 * is clickable, the caller wraps it in the `<label>` that owns the checkbox —
 * this host is `display: contents`, so the label is the real box and the hit
 * area is the whole row without this component knowing anything about it. Set
 * `interactive` to get the hover tint that advertises it.
 */
@Component({
  selector: 'app-list-row',
  templateUrl: './list-row.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ListRow {
  readonly title = input.required<string>();
  readonly subtitle = input<string | undefined>(undefined);
  /** Paints the hover tint. The caller still owns the actual interaction. */
  readonly interactive = input(false);

  protected readonly rootClasses = computed(() => {
    return [
      'flex min-h-[60px] w-full items-center gap-3 px-4 py-3',
      this.interactive()
        ? 'cursor-pointer transition-colors duration-150 ease-brand hover:bg-field'
        : '',
    ]
      .filter(Boolean)
      .join(' ');
  });
}
