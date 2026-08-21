import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Review, Reviews } from '../../../../core/models';
import { ReviewCard } from '../../molecules/review-card/review-card';
import { Marquee } from '../../molecules/marquee/marquee';
import { StarRating } from '../../atoms/star-rating/star-rating';
import { Figure } from '../../atoms/figure/figure';
import { Skeleton } from '../../atoms/skeleton/skeleton';

/** Bound to `app-review-card`'s required input while its own `loading` skeleton is showing. */
const EMPTY_REVIEW: Review = {
  id: '',
  rating: 0,
  text: '',
  authorName: '',
  authorContext: '',
  date: '',
  avatar: '',
};

/**
 * app-reviews-section — the reviews aggregate bar + grid + quotes marquee
 * (design/Main.dc.html section 11 / Mobile.dc.html reviews section).
 *
 * The aggregate bar's Google "G" mark is drawn with its own fixed
 * four-color brand palette (`#4285F4` / `#34A853` / `#FBBC05` / `#EA4335`),
 * hardcoded exactly as the board draws it. These are not design-system
 * colors — they're a third-party trademark's own fixed identity, the same
 * way an embedded photo isn't a "component color" — so they don't belong
 * in `shared/tokens/theme.css` and aren't treated as a token violation.
 *
 * `Reviews` carries no URL for the aggregate bar's "Ver todas" link, so it
 * arrives as its own optional `allReviewsHref` input; when absent, the
 * link is not rendered (rather than pointing nowhere). The board itself
 * only shows that link at the desktop width — hidden below `md:` here,
 * matching both boards exactly.
 *
 * The grid is `grid-cols-1` on mobile (the board's own mobile mockup only
 * shows one review card, but that reads as a space-saving preview, not an
 * instruction to drop data — `md:grid-cols-3` shows the real column count
 * change the brief asks to respect) so every `Reviews.items` entry renders
 * at both widths.
 *
 * The quotes marquee runs `direction="right"` at 61s — deliberately not a
 * multiple of the convenios marquee's 38s elsewhere, so the two never
 * resynchronize (see `app-marquee`'s own doc).
 *
 * The aggregate rating renders through `DecimalPipe` at the `es-EC` locale
 * (`4,8`, comma decimal) — same `registerLocaleData('es-EC')` requirement
 * already flagged by `app-price-row`'s `CurrencyPipe` usage.
 */
@Component({
  selector: 'app-reviews-section',
  imports: [DecimalPipe, ReviewCard, Marquee, StarRating, Figure, Skeleton],
  templateUrl: './reviews-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ReviewsSection {
  readonly reviews = input.required<Reviews>();
  readonly allReviewsHref = input<string | undefined>(undefined);
  readonly loading = input(false);

  protected readonly skeletonItems = [0, 1, 2];

  /** Fixed placeholder count matching `jsons/landing/reviews.json`'s 5 quotes. */
  protected readonly quoteSkeletonItems = [0, 1, 2, 3, 4];
  protected readonly emptyReview = EMPTY_REVIEW;
}
