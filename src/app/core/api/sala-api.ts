import { Injectable, inject, signal } from '@angular/core';
import { httpResource, type HttpResourceRef } from '@angular/common/http';

import { SALA_SCREEN_URL } from './sala-screen-url';
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

  readonly screen: HttpResourceRef<WaitingRoomScreen | undefined> = httpResource<WaitingRoomScreen>(
    () => {
      const sedeId = this.sedeId();
      return sedeId ? this.urlFor(sedeId) : undefined;
    },
  );
}
