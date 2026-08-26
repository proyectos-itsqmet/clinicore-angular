import { Injectable, inject } from '@angular/core';
import { httpResource, type HttpResourceRef } from '@angular/common/http';

import { LANDING_DATA_BASE_URL } from './landing-data-base-url';
import { LANDING_FALLBACK_BASE_URL } from './landing-fallback-base-url';
import type {
  Coverage,
  Doctors,
  Faq,
  Hero,
  HowItWorks,
  Insurers,
  Locations,
  PublicInsurance,
  QuickAccess,
  Reviews,
  Site,
  Specialties,
  Stats,
} from '../models';

/**
 * Single access point to the landing page's data contract.
 *
 * One `httpResource` per resource, created once as a readonly field so every
 * consumer (any organism, in any route) shares the same reactive request
 * instead of each caller triggering its own fetch — the resource is created
 * eagerly at service construction, inside the DI context `httpResource`
 * requires, rather than lazily behind a method call that could run outside
 * an injection context.
 *
 * Only `features/landing` and `core/api` may inject this service — atoms,
 * molecules and organisms stay presentational and receive data via `input()`.
 *
 * Each resource exposes `value()`, `isLoading()`, `error()` and `hasValue()`,
 * which is exactly what feeds the skeleton contract: an organism paints its
 * skeleton while `isLoading()` is true or `hasValue()` is false.
 */
@Injectable({ providedIn: 'root' })
export class LandingApi {
  private readonly baseUrl = inject(LANDING_DATA_BASE_URL);
  private readonly fallbackUrl = inject(LANDING_FALLBACK_BASE_URL);

  readonly site: HttpResourceRef<Site | undefined> = httpResource<Site>(
    () => `${this.baseUrl}/site.json`,
  );

  /** Idle unless `site` failed — see LANDING_FALLBACK_BASE_URL. */
  readonly siteFallback: HttpResourceRef<Site | undefined> = httpResource<Site>(
    () => (this.site.error() ? `${this.fallbackUrl}/site.json` : undefined),
  );

  readonly hero: HttpResourceRef<Hero | undefined> = httpResource<Hero>(
    () => `${this.baseUrl}/hero.json`,
  );

  /** Idle unless `hero` failed — see LANDING_FALLBACK_BASE_URL. */
  readonly heroFallback: HttpResourceRef<Hero | undefined> = httpResource<Hero>(
    () => (this.hero.error() ? `${this.fallbackUrl}/hero.json` : undefined),
  );

  readonly quickAccess: HttpResourceRef<QuickAccess | undefined> = httpResource<QuickAccess>(
    () => `${this.baseUrl}/quick-access.json`,
  );

  /** Idle unless `quickAccess` failed — see LANDING_FALLBACK_BASE_URL. */
  readonly quickAccessFallback: HttpResourceRef<QuickAccess | undefined> = httpResource<QuickAccess>(
    () => (this.quickAccess.error() ? `${this.fallbackUrl}/quick-access.json` : undefined),
  );

  readonly stats: HttpResourceRef<Stats | undefined> = httpResource<Stats>(
    () => `${this.baseUrl}/stats.json`,
  );

  /** Idle unless `stats` failed — see LANDING_FALLBACK_BASE_URL. */
  readonly statsFallback: HttpResourceRef<Stats | undefined> = httpResource<Stats>(
    () => (this.stats.error() ? `${this.fallbackUrl}/stats.json` : undefined),
  );

  readonly insurers: HttpResourceRef<Insurers | undefined> = httpResource<Insurers>(
    () => `${this.baseUrl}/insurers.json`,
  );

  /** Idle unless `insurers` failed — see LANDING_FALLBACK_BASE_URL. */
  readonly insurersFallback: HttpResourceRef<Insurers | undefined> = httpResource<Insurers>(
    () => (this.insurers.error() ? `${this.fallbackUrl}/insurers.json` : undefined),
  );

  readonly specialties: HttpResourceRef<Specialties | undefined> = httpResource<Specialties>(
    () => `${this.baseUrl}/specialties.json`,
  );

  /** Idle unless `specialties` failed — see LANDING_FALLBACK_BASE_URL. */
  readonly specialtiesFallback: HttpResourceRef<Specialties | undefined> = httpResource<Specialties>(
    () => (this.specialties.error() ? `${this.fallbackUrl}/specialties.json` : undefined),
  );

  readonly howItWorks: HttpResourceRef<HowItWorks | undefined> = httpResource<HowItWorks>(
    () => `${this.baseUrl}/how-it-works.json`,
  );

  /** Idle unless `howItWorks` failed — see LANDING_FALLBACK_BASE_URL. */
  readonly howItWorksFallback: HttpResourceRef<HowItWorks | undefined> = httpResource<HowItWorks>(
    () => (this.howItWorks.error() ? `${this.fallbackUrl}/how-it-works.json` : undefined),
  );

  readonly doctors: HttpResourceRef<Doctors | undefined> = httpResource<Doctors>(
    () => `${this.baseUrl}/doctors.json`,
  );

  /** Idle unless `doctors` failed — see LANDING_FALLBACK_BASE_URL. */
  readonly doctorsFallback: HttpResourceRef<Doctors | undefined> = httpResource<Doctors>(
    () => (this.doctors.error() ? `${this.fallbackUrl}/doctors.json` : undefined),
  );

  readonly locations: HttpResourceRef<Locations | undefined> = httpResource<Locations>(
    () => `${this.baseUrl}/locations.json`,
  );

  /** Idle unless `locations` failed — see LANDING_FALLBACK_BASE_URL. */
  readonly locationsFallback: HttpResourceRef<Locations | undefined> = httpResource<Locations>(
    () => (this.locations.error() ? `${this.fallbackUrl}/locations.json` : undefined),
  );

  readonly reviews: HttpResourceRef<Reviews | undefined> = httpResource<Reviews>(
    () => `${this.baseUrl}/reviews.json`,
  );

  /** Idle unless `reviews` failed — see LANDING_FALLBACK_BASE_URL. */
  readonly reviewsFallback: HttpResourceRef<Reviews | undefined> = httpResource<Reviews>(
    () => (this.reviews.error() ? `${this.fallbackUrl}/reviews.json` : undefined),
  );

  readonly faq: HttpResourceRef<Faq | undefined> = httpResource<Faq>(
    () => `${this.baseUrl}/faq.json`,
  );

  /** Idle unless `faq` failed — see LANDING_FALLBACK_BASE_URL. */
  readonly faqFallback: HttpResourceRef<Faq | undefined> = httpResource<Faq>(
    () => (this.faq.error() ? `${this.fallbackUrl}/faq.json` : undefined),
  );

  readonly publicInsurance: HttpResourceRef<PublicInsurance | undefined> =
    httpResource<PublicInsurance>(() => `${this.baseUrl}/public-insurance.json`);

  /** Idle unless `publicInsurance` failed — see LANDING_FALLBACK_BASE_URL. */
  readonly publicInsuranceFallback: HttpResourceRef<PublicInsurance | undefined> = httpResource<PublicInsurance>(
    () => (this.publicInsurance.error() ? `${this.fallbackUrl}/public-insurance.json` : undefined),
  );

  readonly coverage: HttpResourceRef<Coverage | undefined> = httpResource<Coverage>(
    () => `${this.baseUrl}/coverage.json`,
  );

  /** Idle unless `coverage` failed — see LANDING_FALLBACK_BASE_URL. */
  readonly coverageFallback: HttpResourceRef<Coverage | undefined> = httpResource<Coverage>(
    () => (this.coverage.error() ? `${this.fallbackUrl}/coverage.json` : undefined),
  );
}
