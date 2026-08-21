import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Doctor, Doctors } from '../../../../core/models';
import { Icon } from '../../atoms/icon/icon';
import { Kicker } from '../../atoms/kicker/kicker';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { DoctorCard } from '../../molecules/doctor-card/doctor-card';

/** Bound to `app-doctor-card`'s required input while its own `loading` skeleton is showing. */
const EMPTY_DOCTOR: Doctor = {
  id: '',
  name: '',
  specialty: '',
  registrationNumber: '',
  image: '',
  upcomingSlots: [],
};

/**
 * app-doctors-section — "Nuestros médicos" (design/Main.dc.html section 8,
 * design/Mobile.dc.html "Quién te va a atender."): a heading, the "ver los
 * N especialistas" link, and a grid of `app-doctor-card`.
 *
 * Desktop renders the design's static 4-column grid. Mobile does not
 * repeat that grid at 1 column (four 300px-tall portraits stacked would
 * push the section past a full screen of scrolling) — it becomes a
 * horizontal scroll-snap carousel instead, one card per view, per the
 * brief. Each `<app-doctor-card>` is wrapped in a plain element that is a
 * flex/scroll item on mobile and collapses to `contents` at `md:`, so the
 * card's own host (already `contents`) hands its real `<app-card>` box
 * straight to the grid on desktop without an extra wrapper box.
 */
@Component({
  selector: 'app-doctors-section',
  imports: [Icon, Kicker, Skeleton, DoctorCard],
  templateUrl: './doctors-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class DoctorsSection {
  readonly doctors = input.required<Doctors>();
  readonly loading = input(false);

  /** Fixed placeholder count matching `jsons/landing/doctors.json`'s 4 items. */
  protected readonly skeletonItems = [0, 1, 2, 3] as const;
  protected readonly emptyDoctor = EMPTY_DOCTOR;
}
