import { InjectionToken } from '@angular/core';

/**
 * Builds the waiting-room screen's URL from a sede id.
 *
 * A FUNCTION, not a base-URL string like `LANDING_DATA_BASE_URL` — and that is
 * the whole point. The landing's resources are one file each at a fixed path,
 * so a base URL is enough. This one is per-sede, and the mock cannot be: there
 * is a single `jsons/sala/pantalla.json`, not one file per sede.
 *
 * WIRED 2026-08-25. Esta factory devolvia un unico archivo estatico e IGNORABA
 * el sedeId por completo, por eso cada /sala/<lo-que-sea> pintaba exactamente
 * el mismo payload quemado.
 *
 * El backend acepta el id numerico O el nombre de la sede, asi que /sala/matriz
 * sigue andando como URL que alguien escribe una sola vez en el navegador de un
 * televisor y no vuelve a tocar.
 *
 * Same generated-copy caveat as the landing mocks applies: `public/mock/sala`
 * is a COPY of `jsons/sala`, refreshed only by the npm pre-hooks (`prestart`,
 * `prebuild`, `prewatch`, `pretest`). A bare `ng serve` / `ng build` serves the
 * stale copy and nothing catches it — `httpResource` casts the parsed body to
 * its model without validating it. Run npm scripts, not `ng`.
 */
export const SALA_SCREEN_URL = new InjectionToken<(sedeId: string) => string>('SALA_SCREEN_URL', {
  providedIn: 'root',
  factory: () => (sedeId: string) =>
    `http://localhost:8080/api/sala/${encodeURIComponent(sedeId)}/pantalla`,
});
