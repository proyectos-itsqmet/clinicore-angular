import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { LocationItem, Locations } from '../../../../core/models';
import { LocationCard } from '../../molecules/location-card/location-card';
import { SectionHeading } from '../../atoms/section-heading/section-heading';
import { Skeleton } from '../../atoms/skeleton/skeleton';

/** Bound to `app-location-card`'s required inputs while its own `loading` skeleton is showing. */
const EMPTY_LOCATION: LocationItem = {
  id: '',
  name: '',
  address: '',
  phone: '',
  schedule: '',
  emergencyService: '',
};

/**
 * app-locations-section — "Nuestras instalaciones" (design/Main.dc.html
 * section 10 / Mobile.dc.html "sedes"): an asymmetric photo grid of the
 * clinic's sedes.
 *
 * The board's own grid is a *pure* photo mosaic with no text — the brief
 * for this organism explicitly asks for `app-location-card` instead (name,
 * address, schedule, emergency note under each photo), which is the
 * fuller, production-ready composition `app-location-card` was built for
 * (see molecules/README.md's synthesis note). This organism follows that
 * instruction over the board's literal text-less mosaic.
 *
 * `Locations.gallery` is one shared photo array, not per-item — paired
 * with `items` by index (wrapping if there are more sedes than photos).
 *
 * Layout: a plain, *not* asymmetric grid (`grid-cols-2` on mobile,
 * `auto-fit` tracks of 320px-or-wider from `md:`), even though the brief asks for the board's
 * asymmetric mosaic (one tall tile + smaller ones). `app-location-card`'s
 * photo is a fixed `h-[203px]`, with no input to stretch it — giving the
 * first tile a taller grid row (`row-span-2`) would just leave dead empty
 * space below its fixed-height photo instead of a bigger picture. Flagged
 * as a real `app-location-card` gap (no `imageHeight`/fill mode) in the
 * delivery report rather than shipping a visibly broken tall empty card.
 */
@Component({
  selector: 'app-locations-section',
  imports: [LocationCard, SectionHeading, Skeleton],
  templateUrl: './locations-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class LocationsSection {
  readonly locations = input.required<Locations>();
  readonly loading = input(false);

  /** Fixed placeholder count matching `jsons/landing/locations.json`'s 2 sedes. */
  protected readonly skeletonItems = [0, 1];
  protected readonly emptyLocation = EMPTY_LOCATION;

  protected readonly items = computed(() =>
    this.locations().items.map((item, index) => ({
      item,
      image: this.locations().gallery[index % Math.max(1, this.locations().gallery.length)] ?? '',
    })),
  );
}
