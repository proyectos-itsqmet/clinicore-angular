import { InjectionToken } from '@angular/core';

/**
 * Base URL every `LandingApi` resource is built from.
 *
 * Today it points at the static JSON mocks copied into `public/mock/landing`
 * by `scripts/sync-assets.mjs`. When the real backend endpoints exist,
 * pointing this token's `factory` at the API base URL is the ONLY change
 * required — `LandingApi` never hardcodes a host, so every consumer keeps
 * working untouched.
 *
 * Worth knowing while the mocks are still the source: `public/mock/landing` is
 * a generated COPY of `jsons/landing`, refreshed only by the npm pre-hooks
 * (`prestart`, `prebuild`, `prewatch`, `pretest`). A direct `ng serve` / `ng
 * build` skips them and serves the stale copy, and nothing catches it —
 * `httpResource` casts the parsed body to its model without validating it, so
 * a property the model declares non-optional silently arrives as `undefined`.
 * Angular cannot serve `jsons/landing` in place (`@angular/build:application`
 * refuses asset inputs outside the workspace root), so the copy step is
 * mandatory. Run npm scripts, not `ng` — see `Frontend/README.md`.
 */
export const LANDING_DATA_BASE_URL = new InjectionToken<string>('LANDING_DATA_BASE_URL', {
  providedIn: 'root',
  factory: () => '/mock/landing',
});
