import type { Money } from './shared.model';

export interface SpecialtiesHeader {
  kicker: string;
  title: string;
}

export interface Specialty {
  id: string;
  name: string;
  description: string;
  image: string;
  doctorCount: number | null;
  priceFrom: Money | null;
  tags: string[];
}

export interface SpecialtyGroup {
  id: string;
  label: string;
  specialties: Specialty[];
}

/** GET /api/landing/specialties — static, cacheable content. */
export interface Specialties {
  header: SpecialtiesHeader;
  groups: SpecialtyGroup[];
}
