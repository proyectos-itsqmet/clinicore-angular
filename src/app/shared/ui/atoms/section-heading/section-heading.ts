import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Kicker, KickerTone } from '../kicker/kicker';

/**
 * app-section-heading — kicker + h2 + optional right-aligned note, the
 * pattern repeated at the top of nearly every section in the design
 * (design/Main.dc.html lines 384-388, 507-512, 632-637, ...). Exists so
 * no feature reimplements it by hand.
 */
@Component({
  selector: 'app-section-heading',
  imports: [Kicker],
  templateUrl: './section-heading.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SectionHeading {
  readonly kicker = input<string | undefined>(undefined);
  readonly kickerTone = input<KickerTone>('muted');
  readonly heading = input.required<string>();
  readonly note = input<string | undefined>(undefined);
}
