import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { Specialties, Specialty } from '../../../../core/models';
import { Kicker } from '../../atoms/kicker/kicker';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { Segmented } from '../../molecules/segmented/segmented';
import { SpecialtyCard } from '../../molecules/specialty-card/specialty-card';

const EMPTY_SPECIALTY: Specialty = {
  id: '',
  name: '',
  description: '',
  image: '',
  doctorCount: null,
  priceFrom: null,
  tags: [],
};

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

  protected readonly groupLabels = computed(() =>
    this.specialties().groups.map((group) => group.label),
  );
  protected readonly activeGroup = computed(
    () => this.specialties().groups[this.selectedGroupIndex()],
  );
  protected readonly activeSpecialties = computed(() => this.activeGroup()?.specialties ?? []);

  protected readonly skeletonItems = [0, 1, 2] as const;
  protected readonly emptySpecialty = EMPTY_SPECIALTY;
}
