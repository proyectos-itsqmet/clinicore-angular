import { Injectable, inject } from '@angular/core';
import { httpResource, type HttpResourceRef } from '@angular/common/http';

import { LANDING_DATA_BASE_URL } from './landing-data-base-url';
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

  readonly site: HttpResourceRef<Site | undefined> = httpResource<Site>(
    () => `${this.baseUrl}/site.json`,
  );

  readonly hero: HttpResourceRef<Hero | undefined> = httpResource<Hero>(
    () => `${this.baseUrl}/hero.json`,
  );

  readonly quickAccess: HttpResourceRef<QuickAccess | undefined> = httpResource<QuickAccess>(
    () => `${this.baseUrl}/quick-access.json`,
  );

  readonly stats: HttpResourceRef<Stats | undefined> = httpResource<Stats>(
    () => `${this.baseUrl}/stats.json`,
  );

  readonly insurers: HttpResourceRef<Insurers | undefined> = httpResource<Insurers>(
    () => `${this.baseUrl}/insurers.json`,
  );

  readonly specialties: HttpResourceRef<Specialties | undefined> = httpResource<Specialties>(
    () => `${this.baseUrl}/specialties.json`,
  );

  readonly howItWorks: HttpResourceRef<HowItWorks | undefined> = httpResource<HowItWorks>(
    () => `${this.baseUrl}/how-it-works.json`,
  );

  readonly doctors: HttpResourceRef<Doctors | undefined> = httpResource<Doctors>(
    () => `${this.baseUrl}/doctors.json`,
  );

  readonly locations: HttpResourceRef<Locations | undefined> = httpResource<Locations>(
    () => `${this.baseUrl}/locations.json`,
  );

  readonly reviews: HttpResourceRef<Reviews | undefined> = httpResource<Reviews>(
    () => `${this.baseUrl}/reviews.json`,
  );

  readonly faq: HttpResourceRef<Faq | undefined> = httpResource<Faq>(
    () => `${this.baseUrl}/faq.json`,
  );

  readonly publicInsurance: HttpResourceRef<PublicInsurance | undefined> =
    httpResource<PublicInsurance>(() => `${this.baseUrl}/public-insurance.json`);

  readonly coverage: HttpResourceRef<Coverage | undefined> = httpResource<Coverage>(
    () => `${this.baseUrl}/coverage.json`,
  );
}
