import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  contentChild,
  input,
} from '@angular/core';

import { Skeleton } from '../../atoms/skeleton/skeleton';

/** One column. The table draws the `<th>` and every `<td>` from this. */
export interface TableColumn {
  /** Matched by the caller's cell template. */
  readonly key: string;
  readonly label: string;
  /** `end` right-aligns header and cells — the actions column, and figures. */
  readonly align?: 'start' | 'end';
  /** Keeps the header in the a11y tree but off the screen (actions columns). */
  readonly hiddenLabel?: boolean;
  /** Full ink and semibold: the column that identifies the row. */
  readonly emphasis?: boolean;
  /** Lets long free text wrap. Off by default — table rows read better on one line. */
  readonly wrap?: boolean;
}

/** Context handed to the caller's `#cell` template, once per cell. */
export interface TableCellContext<T> {
  readonly $implicit: T;
  readonly column: TableColumn;
  readonly index: number;
}

/**
 * app-data-table — the card-shaped table surface every list section in the
 * panel renders into: header row, body, loading skeleton, empty state, and a
 * footer slot for the pager.
 *
 * THE TABLE OWNS EVERY `<td>`, the caller only fills them. That is the whole
 * reason the API is a per-CELL template plus a `columns` array instead of the
 * more obvious per-ROW template:
 *
 *   Angular's component styles are emitted UNLAYERED, and Tailwind v4 puts its
 *   utilities in `@layer utilities`. Unlayered rules beat layered ones no matter
 *   the specificity, so anything this component's stylesheet declared on `td`
 *   would silently override any utility a caller put on that same `td`, and
 *   right-aligning one column would stop working with no error. Rendering the
 *   cells here means alignment and emphasis come off the column definition and
 *   there is no cascade to lose.
 *
 * The cost is honest and worth naming: `let-item` in a projected template is
 * `any`, so a typo in a cell expression is not caught at build time. Angular has
 * no way to type a content-projected template's context.
 *
 * NO RESPONSIVE COLUMN HIDING. A narrow screen scrolls the table sideways
 * instead. Hiding columns under a breakpoint means the phone silently shows
 * less DATA than the desktop, and in an admin panel that is how someone deletes
 * the wrong row.
 *
 * LOADING IS A SKELETON, not the word "Cargando". The project LEY asks a loading
 * state to reserve the real geometry — same row count, same column count, same
 * heights — so the table does not jump when the rows land. `aria-busy` on the
 * body is what keeps a screen reader from reading the placeholder bars.
 */
@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet, Skeleton],
  templateUrl: './data-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class DataTable<T> {
  readonly columns = input.required<readonly TableColumn[]>();
  readonly rows = input.required<readonly T[]>();
  /** Stable identity per row — what `@for` tracks by. */
  readonly rowKey = input.required<(row: T) => string | number>();
  /** Names the table for screen readers. Never rendered visually. */
  readonly caption = input.required<string>();
  readonly loading = input(false);
  readonly emptyMessage = input('No hay registros para mostrar.');
  /** Placeholder rows while loading. Matches the API's default page size. */
  readonly skeletonRows = input(5);

  protected readonly cellTemplate = contentChild.required<TemplateRef<TableCellContext<T>>>('cell');

  protected readonly placeholders = computed(() =>
    Array.from({ length: Math.max(1, this.skeletonRows()) }, (_, index) => index),
  );

  protected headerClass(column: TableColumn): string {
    return [
      'whitespace-nowrap px-4 py-3 font-sans text-[12px] font-bold uppercase tracking-[.08em] text-ink-3',
      column.align === 'end' ? 'text-right' : 'text-left',
    ].join(' ');
  }

  protected cellClass(column: TableColumn): string {
    return [
      'px-4 py-3.5 align-middle font-sans text-[14px] leading-[1.45]',
      column.wrap ? '' : 'whitespace-nowrap',
      column.align === 'end' ? 'text-right' : 'text-left',
      column.emphasis ? 'font-semibold text-ink' : 'text-ink-2',
    ]
      .filter(Boolean)
      .join(' ');
  }
}
