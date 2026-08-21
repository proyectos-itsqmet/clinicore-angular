import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Doctor } from '../../../../core/models';
import { Card } from '../card/card';
import { Pill } from '../../atoms/pill/pill';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';

/**
 * app-doctor-card — one card of the "Nuestros médicos" grid
 * (design/Main.dc.html section 8): a 300px portrait, name, specialty,
 * registration number, and a row of upcoming-slot pills.
 *
 * The portrait is reference stock photography, not the doctor's real
 * photo — the disclaimer is carried in the `alt` text itself (rather than
 * a repeated visible caption on every card in a grid) so it survives even
 * if the section-level caption the design shows once isn't rendered.
 *
 * `registrationLabel` defaults to "Reg. Senescyt" (the board's copy), but
 * is an input rather than a fixed string: Senescyt is an Ecuadorian
 * regulator name — domain data, not presentation — and this component must
 * stay reusable by the admin panel, which may show a different regulator
 * or none at all. `Doctor` has no field for it yet (see molecules README).
 */
@Component({
  selector: 'app-doctor-card',
  imports: [Card, Pill, Skeleton, AssetUrlPipe],
  templateUrl: './doctor-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class DoctorCard {
  readonly doctor = input.required<Doctor>();
  readonly registrationLabel = input('Reg. Senescyt');
  readonly loading = input(false);

  protected readonly portraitAlt = computed(
    () => `Fotografía de referencia — ${this.doctor().name}, ${this.doctor().specialty}`,
  );
}
