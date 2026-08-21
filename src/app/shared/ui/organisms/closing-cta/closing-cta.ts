import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Coverage } from '../../../../core/models';
import { Button } from '../../atoms/button/button';
import { Icon } from '../../atoms/icon/icon';
import { Kicker } from '../../atoms/kicker/kicker';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';

/**
 * app-closing-cta — the closing "Agenda en línea" band (design/
 * Main.dc.html section 13): headline + two CTAs over a darkened photo,
 * next to the coverage panel (`Coverage.rows` vs. `noPlanRow`).
 *
 * The background photo's filename lives on the contract
 * (`Coverage.backgroundImage`, e.g. "pediatric.jpg"). This organism owns
 * the `<img>` that renders it, so it reads it straight off `coverage()`
 * and resolves it here with `| assetUrl` — the ownership rule in
 * molecules/README.md: whichever component renders the `<img>` pipes,
 * exactly once, and no caller pipes on its way in.
 *
 * The task names `app-price-row` for these rows, but `CoverageRow` /
 * `CoverageNoPlanRow` (`label` + a single `price`) don't match
 * `BookingService`'s shape (`listPrice` + `insurancePrice` +
 * `insurerLabel` — a struck-through list price against a highlighted
 * plan price). Forcing this simpler label/price pair into that shape
 * would mean inventing fields `Coverage` doesn't have, so the rows are
 * rendered directly here with `CurrencyPipe` instead — flagged in the
 * delivery report rather than silently mismatching the molecule.
 *
 * The phone button uses the `glass` variant — the closest existing
 * on-dark bordered treatment — though the board's own button has no
 * background fill at all, just a border; `glass` adds a translucent
 * film and blur on top. A faithful "outline-only, no fill" button isn't
 * one of `app-button`'s variants (see atoms/README's own variant notes).
 *
 * Money renders through `CurrencyPipe` at `'code'` / `'1.0-0'` / `es-EC`,
 * the same convention `app-price-row` already established (and the same
 * `registerLocaleData('es-EC')` requirement it already flags).
 */
@Component({
  selector: 'app-closing-cta',
  imports: [AssetUrlPipe, CurrencyPipe, Button, Icon, Kicker, Skeleton],
  templateUrl: './closing-cta.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ClosingCta {
  readonly coverage = input.required<Coverage>();
  readonly loading = input(false);
}
