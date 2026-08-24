import { InjectionToken } from '@angular/core';

/**
 * Base URL of the QMS backend — the origin every admin-panel API service builds
 * its requests from.
 *
 * The sibling of `LANDING_DATA_BASE_URL`, and deliberately the same shape: a
 * token with a factory, so the host lives in ONE place instead of being written
 * out in every service. Before this existed it was hardcoded in five files, and
 * the eight services the panel still needs would have made it thirteen.
 *
 * HARDCODED ON PURPOSE, FOR NOW. This is the decision to revisit, not an
 * oversight: the project has no environment mechanism at all today — no
 * `src/environments/`, no `fileReplacements` in `angular.json` — so there is
 * nowhere for a per-environment value to come from yet. Two ways out when it
 * matters, and they are not equivalent:
 *
 *   - Same origin in production → change this factory to `''` and every request
 *     becomes relative (`/api/doctors`). No build config, no CORS. This is what
 *     `LANDING_DATA_BASE_URL` already does.
 *   - Different host → needs a real mechanism. `environment.ts` +
 *     `fileReplacements` decides at BUILD time (one artifact per environment);
 *     reading it out of `index.html` decides at RUNTIME (one artifact for all).
 *
 * Either way this token is the prerequisite, and no consumer changes when the
 * value does — which is the whole point of putting it here first.
 *
 * NOTE the pair this has to stay consistent with: every service also sends
 * `withCredentials: true`, because the session is a cookie the backend sets on
 * `/auth/login-operator`. Point this at a different origin and that cookie needs
 * `SameSite=None; Secure` plus a CORS allow-list — `cors.allowed-origin` in the
 * backend's `application-dev.properties`.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'http://localhost:8080',
});
