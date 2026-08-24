import type { Page } from '../../core/models';
import type { PaginationState } from '../../shared/ui/molecules/pagination/pagination';

/**
 * Translates the API's `Page<T>` envelope into what `app-pagination` draws.
 *
 * IT LIVES IN THE FEATURE LAYER ON PURPOSE. `Page<T>` is a Spring transport
 * shape — `pageable`, `unpaged`, `numberOfElements` — not domain, so a molecule
 * typed against it would be a shared component coupled to one backend's
 * pagination dialect. And `core/models` cannot own the function either: it would
 * have to import `PaginationState` from `shared/ui`, which points the dependency
 * arrow backwards. The feature is the one layer allowed to know both.
 *
 * `rangeStart` is clamped instead of `offset + 1` so an empty result reads
 * "Mostrando 0 a 0 de 0" rather than the "Mostrando 1 a 0 de 0" all four
 * hand-written pagers produced.
 */
export function toPaginationState(page: Page<unknown>): PaginationState {
  const hasRows = page.numberOfElements > 0;

  return {
    page: page.number,
    totalPages: page.totalPages,
    totalElements: page.totalElements,
    rangeStart: hasRows ? page.pageable.offset + 1 : 0,
    rangeEnd: hasRows ? page.pageable.offset + page.numberOfElements : 0,
    first: page.first,
    last: page.last,
  };
}
