import { InjectionToken } from '@angular/core';

/**
 * Base URL every `LandingApi` resource is built from.
 *
 * Today it points at the static JSON mocks copied into `public/mock/landing`
 * by `scripts/sync-assets.mjs`. When the real backend endpoints exist,
 * WIRED 2026-08-25. Apuntaba a /mock/landing, una carpeta de JSON estaticos.
 * Ahora las 13 secciones llegan del backend por una ruta cada una.
 *
 * Una ruta por seccion y no un endpoint agregado: la landing ya tiene limites
 * de error por seccion, cada organismo falla y se reintenta solo. Un endpoint
 * unico convertiria cualquier falla en una portada en blanco.
 *
 * `public/mock/landing` is no longer a generated copy of anything. It used to
 * be refreshed from `../jsons/landing` by npm pre-hooks, and a direct `ng
 * serve` skipped them and served a stale copy that nothing caught —
 * `httpResource` casts the parsed body to its model without validating it, so
 * a property the model declares non-optional arrived as `undefined` in
 * silence. Those hooks are gone and the files are committed here: they are now
 * the source, edited in place, and they are what
 * [LANDING_FALLBACK_BASE_URL] serves when this API is unreachable.
 *
 * Keep them in step with `Backend_QMS/src/main/resources/landing/*.json` by
 * hand — the two are the same contract served from two places, and the
 * fallback is only worth having while it says the same thing.
 */
export const LANDING_DATA_BASE_URL = new InjectionToken<string>('LANDING_DATA_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api/landing',
});
