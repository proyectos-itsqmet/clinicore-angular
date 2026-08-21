import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { LocationItem } from '../../../../core/models';
import { Card } from '../card/card';
import { Icon } from '../../atoms/icon/icon';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';

/**
 * app-location-card — a sede card combining a photo with the address block
 * the design only shows in two separate places: the "Instalaciones"
 * section (pure photo grid, no text) and the footer's sede box (name,
 * address, phone/schedule, emergency note, no photo). No board shows both
 * together, so this composition is synthesized from the two — flagged in
 * the delivery report.
 *
 * `LocationItem` has no per-location photo (`Locations.gallery` is one
 * shared array for the whole section), so the image and the optional
 * map link arrive as their own inputs.
 */
@Component({
  selector: 'app-location-card',
  imports: [Card, Icon, Skeleton, AssetUrlPipe],
  templateUrl: './location-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class LocationCard {
  readonly location = input.required<LocationItem>();
  readonly image = input.required<string>();
  readonly mapHref = input<string | undefined>(undefined);
  readonly loading = input(false);
}
