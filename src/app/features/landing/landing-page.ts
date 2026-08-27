import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import type { HttpResourceRef } from '@angular/common/http';
import { LandingApi } from '../../core/api';
import { ErrorState } from '../../shared/ui/molecules/error-state/error-state';
import { ChatWidget } from '../../shared/ui/organisms/chat-widget/chat-widget';
import { ClosingCta } from '../../shared/ui/organisms/closing-cta/closing-cta';
import { DoctorsSection } from '../../shared/ui/organisms/doctors-section/doctors-section';
import { FaqSection } from '../../shared/ui/organisms/faq-section/faq-section';
import { HeroSection } from '../../shared/ui/organisms/hero-section/hero-section';
import { HowItWorksSection } from '../../shared/ui/organisms/how-it-works/how-it-works';
import { LocationsSection } from '../../shared/ui/organisms/locations-section/locations-section';
import { QuickAccessRail } from '../../shared/ui/organisms/quick-access-rail/quick-access-rail';
import { SiteFooter } from '../../shared/ui/organisms/site-footer/site-footer';
import { SiteHeader } from '../../shared/ui/organisms/site-header/site-header';
import { SpecialtiesSection } from '../../shared/ui/organisms/specialties-section/specialties-section';
import { StatsBand } from '../../shared/ui/organisms/stats-band/stats-band';
import {
  EMPTY_COVERAGE,
  EMPTY_DOCTORS,
  EMPTY_FAQ,
  EMPTY_HERO,
  EMPTY_HOW_IT_WORKS,
  EMPTY_INSURERS,
  EMPTY_LOCATIONS,
  EMPTY_PUBLIC_INSURANCE,
  EMPTY_QUICK_ACCESS,
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
 * */
@Component({
  selector: 'app-landing-page',
  imports: [
    ErrorState,
    SiteHeader,
    HeroSection,
    QuickAccessRail,
    StatsBand,
    SpecialtiesSection,
    HowItWorksSection,
    DoctorsSection,
    LocationsSection,
    FaqSection,
    ClosingCta,
    SiteFooter,
    ChatWidget,
  ],
  templateUrl: './landing-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPage {
  /**
   * The section payload: live first, bundled contract second, empty last.
   *
   * `hasValue()` and not `value() ?? x`: reading `value()` on a resource in the
   * error state RETHROWS rather than returning undefined, so the `??` would
   * throw straight out of the computed — taking down the very section this is
   * meant to keep standing.
   *
   * The empty fixture stays the answer WHILE LOADING, so the organism paints
   * its skeleton. Only a failed request reaches the bundled copy.
   */
  private pick<T>(
    primary: HttpResourceRef<T | undefined>,
    fallback: HttpResourceRef<T | undefined>,
    empty: T,
  ) {
    return computed(() => {
      if (primary.hasValue()) {
        return primary.value() ?? empty;
      }
      if (fallback.hasValue()) {
        return fallback.value() ?? empty;
      }
      return empty;
    });
  }

  /**
   * A section is only in ERROR when the API failed AND the bundled copy failed
   * too. With just the API down there is content to show, so an error box
   * would be a lie — and thirteen of them stacked is what a visitor used to
   * meet whenever the backend restarted.
   */
  private bothFailed<T>(
    primary: HttpResourceRef<T | undefined>,
    fallback: HttpResourceRef<T | undefined>,
  ) {
    return computed(() => !!primary.error() && !!fallback.error());
  }

  /** Still loading while either leg is in flight, so the skeleton covers both. */
  private eitherLoading<T>(
    primary: HttpResourceRef<T | undefined>,
    fallback: HttpResourceRef<T | undefined>,
  ) {
    return computed(() => primary.isLoading() || fallback.isLoading());
  }

  private readonly api = inject(LandingApi);

  protected readonly site = this.pick(this.api.site, this.api.siteFallback, EMPTY_SITE);
  protected readonly siteLoading = this.eitherLoading(this.api.site, this.api.siteFallback);
  protected readonly siteError = this.bothFailed(this.api.site, this.api.siteFallback);

  protected readonly hero = this.pick(this.api.hero, this.api.heroFallback, EMPTY_HERO);
  protected readonly heroLoading = this.eitherLoading(this.api.hero, this.api.heroFallback);
  protected readonly heroError = this.bothFailed(this.api.hero, this.api.heroFallback);

  protected readonly quickAccess = this.pick(this.api.quickAccess, this.api.quickAccessFallback, EMPTY_QUICK_ACCESS);
  protected readonly quickAccessLoading = this.eitherLoading(this.api.quickAccess, this.api.quickAccessFallback);
  protected readonly quickAccessError = this.bothFailed(this.api.quickAccess, this.api.quickAccessFallback);

  /** `app-stats-band` needs both `stats` and `insurers` — one section, one combined state. */
  protected readonly stats = this.pick(this.api.stats, this.api.statsFallback, EMPTY_STATS);
  protected readonly insurers = this.pick(this.api.insurers, this.api.insurersFallback, EMPTY_INSURERS);
  protected readonly statsBandLoading = computed(
    () => this.eitherLoading(this.api.stats, this.api.statsFallback)()
      || this.eitherLoading(this.api.insurers, this.api.insurersFallback)(),
  );
  protected readonly statsBandError = computed(
    () => this.bothFailed(this.api.stats, this.api.statsFallback)()
      || this.bothFailed(this.api.insurers, this.api.insurersFallback)(),
  );

  protected readonly specialties = this.pick(this.api.specialties, this.api.specialtiesFallback, EMPTY_SPECIALTIES);
  protected readonly specialtiesLoading = this.eitherLoading(this.api.specialties, this.api.specialtiesFallback);
  protected readonly specialtiesError = this.bothFailed(this.api.specialties, this.api.specialtiesFallback);

  protected readonly howItWorks = this.pick(this.api.howItWorks, this.api.howItWorksFallback, EMPTY_HOW_IT_WORKS);
  protected readonly howItWorksLoading = this.eitherLoading(this.api.howItWorks, this.api.howItWorksFallback);
  protected readonly howItWorksError = this.bothFailed(this.api.howItWorks, this.api.howItWorksFallback);

  protected readonly doctors = this.pick(this.api.doctors, this.api.doctorsFallback, EMPTY_DOCTORS);
  protected readonly doctorsLoading = this.eitherLoading(this.api.doctors, this.api.doctorsFallback);
  protected readonly doctorsError = this.bothFailed(this.api.doctors, this.api.doctorsFallback);

  /** Also feeds `app-site-footer`'s `locations` input (its sede boxes reuse `LocationItem`). */
  protected readonly locations = this.pick(this.api.locations, this.api.locationsFallback, EMPTY_LOCATIONS);
  protected readonly locationsLoading = this.eitherLoading(this.api.locations, this.api.locationsFallback);
  protected readonly locationsError = this.bothFailed(this.api.locations, this.api.locationsFallback);

  /** `app-faq-section` needs both `faq` and `publicInsurance` — one section, one combined state. */
  protected readonly faq = this.pick(this.api.faq, this.api.faqFallback, EMPTY_FAQ);
  protected readonly publicInsurance = this.pick(this.api.publicInsurance, this.api.publicInsuranceFallback, EMPTY_PUBLIC_INSURANCE);
  protected readonly faqSectionLoading = computed(
    () => this.eitherLoading(this.api.faq, this.api.faqFallback)()
      || this.eitherLoading(this.api.publicInsurance, this.api.publicInsuranceFallback)(),
  );
  protected readonly faqSectionError = computed(
    () => this.bothFailed(this.api.faq, this.api.faqFallback)()
      || this.bothFailed(this.api.publicInsurance, this.api.publicInsuranceFallback)(),
  );

  protected readonly coverage = this.pick(this.api.coverage, this.api.coverageFallback, EMPTY_COVERAGE);
  protected readonly coverageLoading = this.eitherLoading(this.api.coverage, this.api.coverageFallback);
  protected readonly coverageError = this.bothFailed(this.api.coverage, this.api.coverageFallback);

  protected reloadSite(): void {
    this.api.site.reload();
    this.api.siteFallback.reload();
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
    this.api.siteFallback.reload();
    this.api.locations.reload();
    this.api.locationsFallback.reload();
  }

  protected reloadHero(): void {
    this.api.hero.reload();
    this.api.heroFallback.reload();
  }

  protected reloadQuickAccess(): void {
    this.api.quickAccess.reload();
    this.api.quickAccessFallback.reload();
  }

  protected reloadStatsBand(): void {
    this.api.stats.reload();
    this.api.statsFallback.reload();
    this.api.insurers.reload();
    this.api.insurersFallback.reload();
  }

  protected reloadSpecialties(): void {
    this.api.specialties.reload();
    this.api.specialtiesFallback.reload();
  }

  protected reloadHowItWorks(): void {
    this.api.howItWorks.reload();
    this.api.howItWorksFallback.reload();
  }

  protected reloadDoctors(): void {
    this.api.doctors.reload();
    this.api.doctorsFallback.reload();
  }

  protected reloadLocations(): void {
    this.api.locations.reload();
    this.api.locationsFallback.reload();
  }

  protected reloadFaqSection(): void {
    this.api.faq.reload();
    this.api.faqFallback.reload();
    this.api.publicInsurance.reload();
    this.api.publicInsuranceFallback.reload();
  }

  protected reloadCoverage(): void {
    this.api.coverage.reload();
    this.api.coverageFallback.reload();
  }
}
