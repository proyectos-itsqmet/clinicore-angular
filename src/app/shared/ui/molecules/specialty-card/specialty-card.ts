import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Specialty } from '../../../../core/models';
import { Card } from '../card/card';
import { Pill } from '../../atoms/pill/pill';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';

/**
 * app-specialty-card — one card of the "¿Qué necesitas atender hoy?" grid
 * (design/Main.dc.html section 5): a 176px photo, name, description, and a
 * pill row. The pill row reads straight off the model: a `doctorCount` pill
 * and a `priceFrom` pill when both are present (the "consulta" specialties),
 * or the `tags` list rendered as the same tint pill when they aren't (the
 * "control" / "telemedicina" specialties show a single label like "bloque
 * 60 min" instead).
 *
 * `doctorCountLabel` defaults to "médicos" (the board's copy) but is an
 * input: the word "médicos" is domain vocabulary, and an admin panel
 * reusing this card for, say, staff counts or a non-clinical catalog needs
 * to override it. `Specialty` has no unit-label field yet (see molecules
 * README).
 */
@Component({
  selector: 'app-specialty-card',
  imports: [Card, Pill, Skeleton, AssetUrlPipe],
  templateUrl: './specialty-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SpecialtyCard {
  readonly specialty = input.required<Specialty>();
  readonly doctorCountLabel = input('médicos');
  readonly loading = input(false);
}
