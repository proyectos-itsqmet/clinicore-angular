import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { BookingService } from '../../../../core/models';
import { Skeleton } from '../../atoms/skeleton/skeleton';

/**
 * app-price-row — the list-price / plan-price comparison block (design/
 * Main.dc.html section 6, the agenda demo's booking summary): the
 * service name against its struck-through list price, the discounted
 * plan price in an emphasized figure, and an optional disclaimer note.
 *
 * `BookingService` is the one model whose shape already matches this
 * exactly (`listPrice`, `insurancePrice`, `insurerLabel`); the disclaimer
 * lives one level up on `BookingAvailability`, so it arrives separately.
 *
 * Money renders through Angular's own `CurrencyPipe` at the `es-EC`
 * locale, `code` display (`USD 12`) and no decimals, matching the board.
 */
@Component({
  selector: 'app-price-row',
  imports: [CurrencyPipe, Skeleton],
  templateUrl: './price-row.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PriceRow {
  readonly service = input.required<BookingService>();
  readonly note = input<string | undefined>(undefined);
  readonly loading = input(false);
}
