import { Injectable, inject, signal } from '@angular/core';
import { HttpContext, httpResource, type HttpResourceRef } from '@angular/common/http';

import { SALA_SCREEN_URL } from './sala-screen-url';
import { CACHE_ENABLED } from '../cache/cache.tokens';
import type { WaitingRoomScreen } from '../models';

/**
 * Single access point to the waiting-room display's data contract
 * (`GET /api/sala/{sedeId}/pantalla`).
 *
 * Separate from `LandingApi` on purpose: different endpoint, different
 * lifecycle, different consumer. `MedicalRecord.liveScreen` over in the
 * landing contract is the marketing screenshot of this screen, not this
 * screen — see `jsons/sala/README.md`.
 *
 * `sedeId` is a writable signal rather than a method parameter because
 * `httpResource` must be created inside an injection context, which a method
 * called later from a component is not. The feature component writes the route
 * param into it; the resource's url computation reads it and refetches. While
 * it is `null` the computation returns `undefined`, which keeps the resource
 * idle instead of firing a request at a URL built from a missing id.
 *
 * Polling is NOT here. An interval living in a `providedIn: 'root'` service
 * would keep running after the user navigated away from the screen, forever.
 * The component owns the interval and calls `screen.reload()`, so the polling
 * lifetime is exactly the screen's lifetime.
 */
@Injectable({ providedIn: 'root' })
export class SalaApi {
  private readonly urlFor = inject(SALA_SCREEN_URL);

  /** Written by `app-waiting-room-screen` from the `:sedeId` route param. */
  readonly sedeId = signal<string | null>(null);

  /**
   * FUERA DEL CACHÉ, y esa es la línea más importante de este archivo.
   *
   * `CACHE_ENABLED` viene en `true` por defecto y `CACHE_TTL` en 5 minutos
   * (`core/cache/cache.tokens.ts`), así que este GET se cacheaba como cualquier
   * otro. Cada `reload()` — el que dispara el socket cuando llaman a alguien y
   * el del sondeo — recibía `of(cachedResponse)` del interceptor SIN salir a la
   * red. Resultado: el tablero mostraba los mismos turnos durante cinco
   * minutos, con el socket conectado, el topic correcto y los mensajes
   * llegando. Sólo un F5 lo arreglaba, porque creaba una aplicación nueva con
   * el caché vacío.
   *
   * El panel de administración no sufre esto porque cada PUT invalida el caché
   * (`cacheInterceptor`, rama de mutaciones). Esta pantalla NUNCA escribe: sólo
   * lee. Nada invalida su entrada jamás.
   *
   * Un tablero cuyo único trabajo es estar al día no puede pasar por un caché.
   */
  readonly screen: HttpResourceRef<WaitingRoomScreen | undefined> = httpResource<WaitingRoomScreen>(
    () => {
      const sedeId = this.sedeId();
      if (!sedeId) {
        return undefined;
      }

      return {
        url: this.urlFor(sedeId),
        context: new HttpContext().set(CACHE_ENABLED, false),
      };
    },
  );
}
