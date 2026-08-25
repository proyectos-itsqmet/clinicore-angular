import { Observable } from 'rxjs';
import type { Page } from '../models';

/** Result of {@link fetchAllPages}: the concatenated items, plus whether every page was actually retrieved. */
export interface FetchAllPagesResult<T> {
  items: T[];
  /**
   * `false` when the backend never reported `last: true` within `maxPages`
   * requests, or a later page failed after at least one page already
   * succeeded. The caller MUST surface this instead of silently rendering a
   * partial catalog — see `establishments`/`allDoctors` truncation notes in
   * `specialty-detail.component.ts`.
   */
  complete: boolean;
}

/**
 * Fetches every page of a `Page<T>` endpoint and concatenates them into one
 * array, for small reference catalogs (establishments, etc.) that feed a
 * native `<select>` or a "pick one" flow — pagination controls don't make
 * sense on a dropdown, but silently capping at the first page/first N
 * records does. That silent cap (`getAll(0, 100)`) is exactly the bug this
 * helper replaces: past record 100 the rest used to vanish with no error and
 * no indication.
 *
 * NOT meant for high-cardinality entities (doctors, patients): those grow
 * unbounded and need server-side search instead of "load everything". Only
 * use this for catalogs that are genuinely expected to stay small (e.g.
 * physical establishments/sedes).
 *
 * Uses plain recursive `subscribe` calls (no `expand`/`reduce` operators) to
 * match this codebase's existing style — every other API consumer here uses
 * plain `.subscribe({ next, error })`.
 */
export function fetchAllPages<T>(
  fetchPage: (page: number) => Observable<Page<T>>,
  maxPages = 20,
): Observable<FetchAllPagesResult<T>> {
  return new Observable<FetchAllPagesResult<T>>((subscriber) => {
    const items: T[] = [];

    const requestPage = (page: number): void => {
      fetchPage(page).subscribe({
        next: (result) => {
          items.push(...(result.content ?? []));

          if (result.last) {
            subscriber.next({ items, complete: true });
            subscriber.complete();
          } else if (page + 1 >= maxPages) {
            subscriber.next({ items, complete: false });
            subscriber.complete();
          } else {
            requestPage(page + 1);
          }
        },
        error: (err) => {
          if (items.length > 0) {
            subscriber.next({ items, complete: false });
            subscriber.complete();
          } else {
            subscriber.error(err);
          }
        },
      });
    };

    requestPage(0);
  });
}
