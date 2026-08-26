import { InjectionToken } from '@angular/core';

/**
 * Where the landing falls back to when the API is unreachable.
 *
 * These are the SAME contract files the backend serves from its jar, shipped
 * with the app under `public/mock/landing`. Serving them when the API is down
 * is not a pretence: eleven of the thirteen sections are editorial content
 * that changes a few times a year, so the bundled copy IS the same content.
 *
 * A public clinic homepage showing thirteen stacked "Reintentar" boxes is
 * worse than one showing content that is a little old — the same rule the
 * waiting-room screen already follows with its `lastGood` latch.
 *
 * Same-origin and static, so it works precisely when the API does not.
 */
export const LANDING_FALLBACK_BASE_URL = new InjectionToken<string>('LANDING_FALLBACK_BASE_URL', {
  providedIn: 'root',
  factory: () => '/mock/landing',
});
