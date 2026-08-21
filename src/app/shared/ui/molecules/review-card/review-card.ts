import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Review } from '../../../../core/models';
import { Card } from '../card/card';
import { StarRating } from '../../atoms/star-rating/star-rating';
import { Pill } from '../../atoms/pill/pill';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'seconds' },
  { amount: 60, unit: 'minutes' },
  { amount: 24, unit: 'hours' },
  { amount: 7, unit: 'days' },
  { amount: 4.35, unit: 'weeks' },
  { amount: 12, unit: 'months' },
  { amount: Number.POSITIVE_INFINITY, unit: 'years' },
];

/** Formats `date` as a relative label ("hace 3 meses") when it parses as a real date. */
function relativeLabel(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  const formatter = new Intl.RelativeTimeFormat('es-EC', { numeric: 'auto' });
  let duration = (parsed.getTime() - Date.now()) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return date;
}

/**
 * app-review-card — one card of the reviews grid (design/Main.dc.html
 * section 11): star rating, quote, author avatar/name/context, and a
 * relative date. `Review.date` isn't guaranteed to be a parseable date in
 * every fixture (some boards show a plain "07/2026" label) — when it
 * parses, it's rendered relative ("hace 3 meses"); otherwise it's shown
 * as-is.
 *
 * The origin badge ("Google", ...) isn't part of the per-review model
 * (only `ReviewsAggregate.source` carries it), so it arrives as its own
 * input.
 */
@Component({
  selector: 'app-review-card',
  imports: [Card, StarRating, Pill, Skeleton, AssetUrlPipe],
  templateUrl: './review-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ReviewCard {
  readonly review = input.required<Review>();
  readonly source = input('Google');
  readonly loading = input(false);

  protected readonly relativeDate = computed(() => relativeLabel(this.review().date));
}
