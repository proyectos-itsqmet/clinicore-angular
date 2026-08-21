import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { LandingApi } from '../../core/api';
import { ErrorState } from '../../shared/ui/molecules/error-state/error-state';
import { BookingSection, type BookingSelection } from '../../shared/ui/organisms/booking-section/booking-section';
import { ClosingCta } from '../../shared/ui/organisms/closing-cta/closing-cta';
import { DoctorsSection } from '../../shared/ui/organisms/doctors-section/doctors-section';
import { FaqSection } from '../../shared/ui/organisms/faq-section/faq-section';
import { HeroSection } from '../../shared/ui/organisms/hero-section/hero-section';
import { HowItWorksSection } from '../../shared/ui/organisms/how-it-works/how-it-works';
import { LocationsSection } from '../../shared/ui/organisms/locations-section/locations-section';
import { MedicalRecordBento } from '../../shared/ui/organisms/medical-record-bento/medical-record-bento';
import { QuickAccessRail } from '../../shared/ui/organisms/quick-access-rail/quick-access-rail';
import { ReviewsSection } from '../../shared/ui/organisms/reviews-section/reviews-section';
import { SiteFooter } from '../../shared/ui/organisms/site-footer/site-footer';
import { SiteHeader } from '../../shared/ui/organisms/site-header/site-header';
import { SpecialtiesSection } from '../../shared/ui/organisms/specialties-section/specialties-section';
import { StatsBand } from '../../shared/ui/organisms/stats-band/stats-band';
import {
  EMPTY_BOOKING_AVAILABILITY,
  EMPTY_COVERAGE,
  EMPTY_DOCTORS,
  EMPTY_FAQ,
  EMPTY_HERO,
  EMPTY_HOW_IT_WORKS,
  EMPTY_INSURERS,
  EMPTY_LOCATIONS,
  EMPTY_MEDICAL_RECORD,
  EMPTY_PUBLIC_INSURANCE,
  EMPTY_QUICK_ACCESS,
  EMPTY_REVIEWS,
  EMPTY_SITE,
  EMPTY_SPECIALTIES,
  EMPTY_STATS,
} from './landing-empty-fixtures';

/**
 * app-landing-page — the container for the whole clinic landing.
 *
 * This is the ONLY place in the landing's tree that injects anything:
 * one `httpResource`-backed field of `LandingApi` per section, exposed to
 * the template as `resource.value() ?? EMPTY_X` (see
 * `landing-empty-fixtures.ts` for why the fallback is required — several
 * organisms read their data input unconditionally, so it can never be
 * `undefined`, only "empty"), plus that resource's own `isLoading()` fed
 * straight to the organism's `loading` input.
 *
 * `error()` is handled per section: a failed resource renders
 * `app-error-state` instead of the organism, with a `retry` that calls
 * that resource's `reload()` — an organism must never be stuck on its own
 * skeleton forever just because a fetch failed.
 *
 * `booked` (from `app-booking-section`) has nowhere real to go yet — the
 * reservation endpoint doesn't exist — so it's logged with a TODO instead
 * of silently dropped.
 */
@Component({
  selector: 'app-landing-page',
  imports: [
    ErrorState,
    SiteHeader,
    HeroSection,
    QuickAccessRail,
    StatsBand,
    SpecialtiesSection,
    BookingSection,
    HowItWorksSection,
    DoctorsSection,
    MedicalRecordBento,
    LocationsSection,
    ReviewsSection,
    FaqSection,
    ClosingCta,
    SiteFooter,
  ],
  templateUrl: './landing-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPage {
  private readonly api = inject(LandingApi);

  protected readonly site = computed(() => this.api.site.value() ?? EMPTY_SITE);
  protected readonly siteLoading = this.api.site.isLoading;
  protected readonly siteError = this.api.site.error;

  protected readonly hero = computed(() => this.api.hero.value() ?? EMPTY_HERO);
  protected readonly heroLoading = this.api.hero.isLoading;
  protected readonly heroError = this.api.hero.error;

  protected readonly quickAccess = computed(() => this.api.quickAccess.value() ?? EMPTY_QUICK_ACCESS);
  protected readonly quickAccessLoading = this.api.quickAccess.isLoading;
  protected readonly quickAccessError = this.api.quickAccess.error;

  /** `app-stats-band` needs both `stats` and `insurers` — one section, one combined state. */
  protected readonly stats = computed(() => this.api.stats.value() ?? EMPTY_STATS);
  protected readonly insurers = computed(() => this.api.insurers.value() ?? EMPTY_INSURERS);
  protected readonly statsBandLoading = computed(() => this.api.stats.isLoading() || this.api.insurers.isLoading());
  protected readonly statsBandError = computed(() => this.api.stats.error() ?? this.api.insurers.error());

  protected readonly specialties = computed(() => this.api.specialties.value() ?? EMPTY_SPECIALTIES);
  protected readonly specialtiesLoading = this.api.specialties.isLoading;
  protected readonly specialtiesError = this.api.specialties.error;

  protected readonly bookingAvailability = computed(
    () => this.api.bookingAvailability.value() ?? EMPTY_BOOKING_AVAILABILITY,
  );
  protected readonly bookingLoading = this.api.bookingAvailability.isLoading;
  protected readonly bookingError = this.api.bookingAvailability.error;

  protected readonly howItWorks = computed(() => this.api.howItWorks.value() ?? EMPTY_HOW_IT_WORKS);
  protected readonly howItWorksLoading = this.api.howItWorks.isLoading;
  protected readonly howItWorksError = this.api.howItWorks.error;

  protected readonly doctors = computed(() => this.api.doctors.value() ?? EMPTY_DOCTORS);
  protected readonly doctorsLoading = this.api.doctors.isLoading;
  protected readonly doctorsError = this.api.doctors.error;

  protected readonly medicalRecord = computed(() => this.api.medicalRecord.value() ?? EMPTY_MEDICAL_RECORD);
  protected readonly medicalRecordLoading = this.api.medicalRecord.isLoading;
  protected readonly medicalRecordError = this.api.medicalRecord.error;

  /** Also feeds `app-site-footer`'s `locations` input (its sede boxes reuse `LocationItem`). */
  protected readonly locations = computed(() => this.api.locations.value() ?? EMPTY_LOCATIONS);
  protected readonly locationsLoading = this.api.locations.isLoading;
  protected readonly locationsError = this.api.locations.error;

  protected readonly reviews = computed(() => this.api.reviews.value() ?? EMPTY_REVIEWS);
  protected readonly reviewsLoading = this.api.reviews.isLoading;
  protected readonly reviewsError = this.api.reviews.error;

  /** `app-faq-section` needs both `faq` and `publicInsurance` — one section, one combined state. */
  protected readonly faq = computed(() => this.api.faq.value() ?? EMPTY_FAQ);
  protected readonly publicInsurance = computed(() => this.api.publicInsurance.value() ?? EMPTY_PUBLIC_INSURANCE);
  protected readonly faqSectionLoading = computed(() => this.api.faq.isLoading() || this.api.publicInsurance.isLoading());
  protected readonly faqSectionError = computed(() => this.api.faq.error() ?? this.api.publicInsurance.error());

  protected readonly coverage = computed(() => this.api.coverage.value() ?? EMPTY_COVERAGE);
  protected readonly coverageLoading = this.api.coverage.isLoading;
  protected readonly coverageError = this.api.coverage.error;

  protected reloadSite(): void {
    this.api.site.reload();
  }

  /**
   * `app-site-footer` reads both `site()` and `locations()` (its sede
   * boxes), so its error umbrella (`siteError() || locationsError()`) must
   * retry both resources — calling only `reloadSite()` would leave the
   * footer stuck on its error state forever whenever `locations` alone had
   * failed, since that retry can never touch the resource that's actually
   * broken.
   */
  protected reloadFooter(): void {
    this.api.site.reload();
    this.api.locations.reload();
  }

  protected reloadHero(): void {
    this.api.hero.reload();
  }

  protected reloadQuickAccess(): void {
    this.api.quickAccess.reload();
  }

  protected reloadStatsBand(): void {
    this.api.stats.reload();
    this.api.insurers.reload();
  }

  protected reloadSpecialties(): void {
    this.api.specialties.reload();
  }

  protected reloadBooking(): void {
    this.api.bookingAvailability.reload();
  }

  protected reloadHowItWorks(): void {
    this.api.howItWorks.reload();
  }

  protected reloadDoctors(): void {
    this.api.doctors.reload();
  }

  protected reloadMedicalRecord(): void {
    this.api.medicalRecord.reload();
  }

  protected reloadLocations(): void {
    this.api.locations.reload();
  }

  protected reloadReviews(): void {
    this.api.reviews.reload();
  }

  protected reloadFaqSection(): void {
    this.api.faq.reload();
    this.api.publicInsurance.reload();
  }

  protected reloadCoverage(): void {
    this.api.coverage.reload();
  }

  /**
   * TODO(booking-endpoint): there is no reservation endpoint yet — this is
   * the demo agenda widget confirming a local-only selection. Once
   * `POST /api/landing/booking` (or equivalent) exists, call it here with
   * `selection.doctor` / `selection.day` / `selection.slot` instead of
   * just logging.
   */
  protected onBooked(selection: BookingSelection): void {
    console.info('[landing] booking confirmed (demo only, no backend yet):', selection);
  }
}
