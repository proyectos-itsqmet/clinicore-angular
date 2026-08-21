import { InjectionToken } from '@angular/core';

/**
 * Builds the waiting-room screen's URL from a sede id.
 *
 * A FUNCTION, not a base-URL string like `LANDING_DATA_BASE_URL` — and that is
 * the whole point. The landing's resources are one file each at a fixed path,
 * so a base URL is enough. This one is per-sede, and the mock cannot be: there
 * is a single `jsons/sala/pantalla.json`, not one file per sede.
 *
 * Putting the whole URL shape behind the token means the sede id is plumbed
 * through FOR REAL today — the route param reaches this function — while the
 * mock is free to ignore it. When the backend exists, this factory becomes
 *
 *   factory: () => (sedeId: string) => `/api/sala/${encodeURIComponent(sedeId)}/pantalla`
 *
 * and NOTHING else in the app changes. No consumer, no component, no test.
 *
 * Same generated-copy caveat as the landing mocks applies: `public/mock/sala`
 * is a COPY of `jsons/sala`, refreshed only by the npm pre-hooks (`prestart`,
 * `prebuild`, `prewatch`, `pretest`). A bare `ng serve` / `ng build` serves the
 * stale copy and nothing catches it — `httpResource` casts the parsed body to
 * its model without validating it. Run npm scripts, not `ng`.
 */
export const SALA_SCREEN_URL = new InjectionToken<(sedeId: string) => string>('SALA_SCREEN_URL', {
  providedIn: 'root',
  factory: () => () => '/mock/sala/pantalla.json',
});
