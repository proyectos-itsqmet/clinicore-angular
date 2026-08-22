export interface PageableSort {
  empty: boolean;
  sorted: boolean;
  unsorted: boolean;
}

export interface Pageable {
  offset: number;
  pageNumber: number;
  pageSize: number;
  paged: boolean;
  unpaged: boolean;
  sort: PageableSort;
}

export interface Page<T> {
  content: T[];
  empty: boolean;
  first: boolean;
  last: boolean;
  number: number;
  numberOfElements: number;
  size: number;
  totalElements: number;
  totalPages: number;
  pageable: Pageable;
  sort: PageableSort;
}
