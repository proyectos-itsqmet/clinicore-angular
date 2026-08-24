import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Icon } from '../../atoms/icon/icon';

/**
 * Everything this molecule needs to draw a pager, and nothing about where the
 * rows came from.
 *
 * It is NOT `Page<T>`. That shape is the Spring transport envelope — `pageable`,
 * `sort`, `unpaged`, `numberOfElements` — and a molecule that types an input
 * with it is a molecule coupled to one backend's pagination dialect. The
 * translation is one function, `toPaginationState` in `core/models`, and it
 * lives on the model side of the line for the same reason.
 */
export interface PaginationState {
  /** Zero-based, the way the API counts. Rendered one-based. */
  readonly page: number;
  readonly totalPages: number;
  readonly totalElements: number;
  /** One-based inclusive index of the first row on this page. */
  readonly rangeStart: number;
  readonly rangeEnd: number;
  readonly first: boolean;
  readonly last: boolean;
}

/**
 * app-pagination — the pager under every table in the panel.
 *
 * IT IS VISIBLE AT EVERY WIDTH, and that is a bug fix, not a style choice. All
 * four hand-written pagers this replaces wrapped their entire contents in
 * `hidden sm:flex`, so on a phone there was no way to reach page two of
 * anything — the rows simply stopped at ten and nothing on screen said
 * otherwise. Under `sm:` the count line moves below the controls instead of
 * beside them; nothing is dropped.
 *
 * `pageChange` EMITS THE TARGET PAGE, not a direction. The caller already has to
 * know which page it is on to have rendered this, and a `next`/`prev` pair
 * makes every consumer re-derive the arithmetic this component just did.
 *
 * The arrows are the system's `chevron` at 44px — the tap floor — and the
 * previous one is the same glyph rotated 180deg rather than a second drawing.
 */
@Component({
  selector: 'app-pagination',
  imports: [Icon],
  templateUrl: './pagination.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Pagination {
  readonly state = input.required<PaginationState>();
  /** Plural noun for the count line, e.g. `'establecimientos'`. */
  readonly itemLabel = input('resultados');

  readonly pageChange = output<number>();

  protected readonly hasPages = computed(() => this.state().totalPages > 1);

  protected goTo(page: number): void {
    const { totalPages } = this.state();
    if (page < 0 || page >= totalPages) {
      return;
    }
    this.pageChange.emit(page);
  }
}
