import type {
  BookingAvailability,
  Coverage,
  Doctors,
  Faq,
  Hero,
  HowItWorks,
  Insurers,
  Locations,
  MedicalRecord,
  PublicInsurance,
  QuickAccess,
  Site,
  Specialties,
  Stats,
} from '../../core/models';

/**
 * One "empty but well-shaped" fallback per `LandingApi` resource.
 *
 * Every organism this page composes types its data input as
 * `input.required<T>()` — never `T | undefined` — because that is the
 * presentational contract the whole `shared/ui` tree is built on (see
 * `shared/ui/organisms/README.md`). Several organisms also read that
 * input's nested fields *unconditionally* in their template, outside any
 * `@if (loading())` branch (`app-hero-section`, `app-specialties-section`,
 * `app-how-it-works`, `app-quick-access-rail`, `app-stats-band`, and the
 * doctor grid inside `app-doctors-section`) — so this container cannot
 * simply withhold the input while a resource is loading or has failed.
 *
 * These constants are what gets bound instead of `resource.value()` for
 * exactly those two states (`isLoading()` / `error()`); the organism's own
 * `loading` input still decides whether it paints its skeleton or its real
 * markup, this only guarantees the required input is never `undefined`.
 *
 * `EMPTY_SPECIALTIES` carries one placeholder group, and the reason is
 * presentational rather than defensive — worth stating precisely, because the
 * obvious guess is wrong. `app-specialties-section` already tolerates an empty
 * `groups` array: `activeGroup()` (`groups[selectedGroupIndex()]`) is allowed
 * to be `undefined` and `activeSpecialties` narrows it with `?.` and `?? []`,
 * while the template only ever binds `groupLabels()` and `activeSpecialties()`,
 * never `activeGroup()` directly. So `groups: []` would render an empty
 * segmented control and zero cards, not throw. The single group is here only so
 * the segmented control still reserves its geometry while loading. The two are
 * independent: keep the placeholder group AND keep the `?.` — neither one
 * licenses removing the other.
 *
 * What `app-specialties-section` genuinely needs, and why it belongs in the
 * list above, is a defined `specialties` object: `groupLabels` reads
 * `.groups` off the required input outside any loading branch.
 */

export const EMPTY_SITE: Site = {
  brand: { name: '' },
  contact: { phone: '', emergencyPhone: '', whatsapp: '', email: '' },
  nav: { primary: [] },
  footer: {
    description: '',
    specialtyLinks: [],
    patientLinks: [],
    legalLinks: [],
  },
  legal: { disclaimer: '', copyright: '' },
};

export const EMPTY_HERO: Hero = {
  kicker: '',
  title: '',
  lead: '',
  trustPills: [],
  ctas: {
    primary: { label: '', href: '#' },
    contact: { label: '', href: '#' },
  },
  images: { background: '', inset: '' },
  availability: { label: '', count: 0, unit: '', specialty: '', location: '' },
};

export const EMPTY_QUICK_ACCESS: QuickAccess = {
  items: [],
};

export const EMPTY_STATS: Stats = {
  items: [],
};

export const EMPTY_INSURERS: Insurers = {
  header: { kicker: '' },
  items: [],
};

export const EMPTY_SPECIALTIES: Specialties = {
  header: { kicker: '', title: '' },
  // One placeholder group to hold the segmented control's geometry, NOT a
  // null-safety guard — see the doc comment above.
  groups: [{ id: '', label: '', specialties: [] }],
};

export const EMPTY_BOOKING_AVAILABILITY: BookingAvailability = {
  header: { kicker: '', title: '', lead: '' },
  badge: '',
  doctors: [],
  days: [],
  slots: [],
  service: {
    name: '',
    listPrice: { amount: 0, currency: 'USD' },
    insurancePrice: { amount: 0, currency: 'USD' },
    insurerLabel: '',
  },
  slotsLegend: '',
  priceDisclaimer: '',
  confirmationNote: '',
};

export const EMPTY_HOW_IT_WORKS: HowItWorks = {
  header: { kicker: '', title: '' },
  steps: [],
};

export const EMPTY_DOCTORS: Doctors = {
  header: { kicker: '', title: '', viewAllHref: '#', totalCount: 0 },
  items: [],
};

export const EMPTY_MEDICAL_RECORD: MedicalRecord = {
  header: { kicker: '', title: '' },
  liveScreen: { status: '', location: '', image: '', currentTicket: '', office: '', nextTickets: [] },
  benefits: [],
};

export const EMPTY_LOCATIONS: Locations = {
  header: { kicker: '', title: '' },
  gallery: [],
  items: [],
};

export const EMPTY_FAQ: Faq = {
  header: { kicker: '', title: '' },
  items: [],
};

export const EMPTY_PUBLIC_INSURANCE: PublicInsurance = {
  header: { kicker: '', title: '' },
  items: [],
};

export const EMPTY_COVERAGE: Coverage = {
  header: { kicker: '', title: '', lead: '' },
  backgroundImage: '',
  ctas: {
    primary: { label: '', href: '#' },
    phone: { label: '', href: 'tel:' },
  },
  panelTitle: '',
  rows: [],
  noPlanRow: { label: '', price: { amount: 0, currency: 'USD' } },
  note: '',
};
