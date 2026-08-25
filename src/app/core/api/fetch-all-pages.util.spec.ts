import { Observable, Subject, of, throwError } from 'rxjs';

import type { Page } from '../models';
import { fetchAllPages, type FetchAllPagesResult } from './fetch-all-pages.util';

function page<T>(content: T[], overrides: Partial<Page<T>> = {}): Page<T> {
  return {
    content,
    empty: content.length === 0,
    first: true,
    last: true,
    number: 0,
    numberOfElements: content.length,
    size: 100,
    totalElements: content.length,
    totalPages: 1,
    pageable: {
      offset: 0,
      pageNumber: 0,
      pageSize: 100,
      paged: true,
      unpaged: false,
      sort: { empty: true, sorted: false, unsorted: true },
    },
    sort: { empty: true, sorted: false, unsorted: true },
    ...overrides,
  };
}

// Every case here uses synchronous sources (`of`, or a `Subject` driven
// manually within the same test tick), so the recursive `subscribe` chain
// inside `fetchAllPages` resolves synchronously — no `done` callback needed
// (this project's Vitest-based `ng test` runner does not support Jasmine's
// `(done) => {}` signature: `it`'s single argument is a `TestContext`, not
// a completion callback).
describe('fetchAllPages', () => {
  it('resolves with a single page content and complete: true when the first page is already last', () => {
    let result: FetchAllPagesResult<number> | undefined;

    fetchAllPages<number>(() => of(page([1, 2, 3], { last: true }))).subscribe((r) => (result = r));

    expect(result).toEqual({ items: [1, 2, 3], complete: true });
  });

  it('requests every page in order and concatenates results instead of stopping at the first one', () => {
    const requestedPages: number[] = [];
    let result: FetchAllPagesResult<number> | undefined;

    fetchAllPages<number>((requestedPage) => {
      requestedPages.push(requestedPage);
      if (requestedPage === 0) return of(page([1, 2], { number: 0, last: false }));
      if (requestedPage === 1) return of(page([3, 4], { number: 1, last: false }));
      return of(page([5], { number: 2, last: true }));
    }).subscribe((r) => (result = r));

    expect(requestedPages).toEqual([0, 1, 2]);
    expect(result).toEqual({ items: [1, 2, 3, 4, 5], complete: true });
  });

  it('stops after maxPages and reports complete: false when the backend never reports last: true', () => {
    let result: FetchAllPagesResult<number> | undefined;

    fetchAllPages<number>((requestedPage) => of(page([requestedPage], { last: false })), 3).subscribe(
      (r) => (result = r),
    );

    expect(result).toEqual({ items: [0, 1, 2], complete: false });
  });

  it('keeps the pages already fetched and reports complete: false when a later page fails', () => {
    let result: FetchAllPagesResult<number> | undefined;

    fetchAllPages<number>((requestedPage) => {
      if (requestedPage === 0) return of(page([1, 2], { last: false }));
      return throwError(() => new Error('network error'));
    }).subscribe((r) => (result = r));

    expect(result).toEqual({ items: [1, 2], complete: false });
  });

  it('propagates the error when the very first page fails (nothing fetched yet)', () => {
    let nextCalled = false;
    let receivedError: unknown;

    fetchAllPages<number>(() => throwError(() => new Error('boom'))).subscribe({
      next: () => (nextCalled = true),
      error: (err) => (receivedError = err),
    });

    expect(nextCalled).toBe(false);
    expect((receivedError as Error).message).toBe('boom');
  });

  it('never requests a second page when the first one is already last (no unnecessary requests)', () => {
    let callCount = 0;

    fetchAllPages<number>(() => {
      callCount++;
      return of(page([1], { last: true }));
    }).subscribe();

    expect(callCount).toBe(1);
  });

  it('supports async sources (Subject) resolving pages out of the current microtask', () => {
    const page0$ = new Subject<Page<number>>();
    const page1$ = new Subject<Page<number>>();
    let result: FetchAllPagesResult<number> | undefined;

    fetchAllPages<number>((requestedPage): Observable<Page<number>> =>
      requestedPage === 0 ? page0$.asObservable() : page1$.asObservable(),
    ).subscribe((r) => (result = r));

    page0$.next(page([1], { last: false }));
    page0$.complete();
    page1$.next(page([2], { last: true }));
    page1$.complete();

    expect(result).toEqual({ items: [1, 2], complete: true });
  });
});
