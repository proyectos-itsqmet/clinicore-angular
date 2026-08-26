import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Branding, BrandingUpdate } from '../models';

/**
 * `personalizacion` (`GET`/`PUT /api/branding`). `GET` is public on the
 * backend (see `GlobalConfig`'s own comment on `BrandingController`), but
 * this sends `withCredentials: true` regardless, matching every other
 * service in this codebase — including the ones fronting other public GETs
 * such as `HolidayApiService#getAll`.
 */
@Injectable({ providedIn: 'root' })
export class BrandingApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api/branding';

  get(): Observable<Branding> {
    return this.http.get<Branding>(this.API_URL, { withCredentials: true });
  }

  /** No `/{id}` — `Branding` is a singleton, see the model's own docblock. */
  save(payload: BrandingUpdate): Observable<Branding> {
    return this.http.put<Branding>(this.API_URL, payload, { withCredentials: true });
  }
}
