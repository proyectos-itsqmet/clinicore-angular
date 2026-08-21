import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { Specialties, Specialty } from '../../../../core/models';
import { Kicker } from '../../atoms/kicker/kicker';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { Segmented } from '../../molecules/segmented/segmented';
import { SpecialtyCard } from '../../molecules/specialty-card/specialty-card';

/** Bound to `app-specialty-card`'s required input while its own `loading` skeleton is showing. */
const EMPTY_SPECIALTY: Specialty = {
  id: '',
  name: '',
  description: '',
  image: '',
  doctorCount: null,
  priceFrom: null,
  tags: [],
};

/**
 * app-specialties-section — "¿Qué necesitas atender hoy?" (design/
 * Main.dc.html section 5, design/Mobile.dc.html "Especialidades"): a
 * segmented control (Consulta / Control / Telemedicina) switching between
 * three grids of `app-specialty-card`.
 *
 * Which panel is showing is view state, not data — it never leaves this
 * component. `app-segmented` is a controlled component (`selectedIndex` /
 * `selectedIndexChange`), so the active group index lives here as a
 * signal and flows down; nothing about it is emitted upward.
 */
@Component({
  selector: 'app-specialties-section',
  imports: [Kicker, Skeleton, Segmented, SpecialtyCard],
  templateUrl: './specialties-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SpecialtiesSection {
  readonly specialties = input.required<Specialties>();
  readonly loading = input(false);

  protected readonly selectedGroupIndex = signal(0);

  protected readonly groupLabels = computed(() => this.specialties().groups.map((group) => group.label));
  protected readonly activeGroup = computed(() => this.specialties().groups[this.selectedGroupIndex()]);
  protected readonly activeSpecialties = computed(() => this.activeGroup()?.specialties ?? []);

  /** Fixed placeholder count matching one group's 3 specialties in `jsons/landing/specialties.json`. */
  protected readonly skeletonItems = [0, 1, 2] as const;
  protected readonly emptySpecialty = EMPTY_SPECIALTY;
}
