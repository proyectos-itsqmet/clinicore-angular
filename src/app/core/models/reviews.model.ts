export interface ReviewsAggregate {
  source: string;
  rating: number;
  totalCount: number;
}

export interface Review {
  id: string;
  rating: number;
  text: string;
  authorName: string;
  authorContext: string;
  date: string;
  avatar: string;
}

export interface ReviewQuote {
  id: string;
  text: string;
}

/**
 * GET /api/landing/reviews — static if curated by hand, live if synced with
 * Google (see jsons/landing/README.md).
 */
export interface Reviews {
  aggregate: ReviewsAggregate;
  items: Review[];
  quotes: ReviewQuote[];
}
