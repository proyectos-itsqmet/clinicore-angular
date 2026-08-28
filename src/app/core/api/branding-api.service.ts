import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Branding, BrandingUpdate } from '../models';

@Injectable({ providedIn: 'root' })
export class BrandingApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api/branding';

  get(): Observable<Branding> {
    return this.http.get<Branding>(this.API_URL, { withCredentials: true });
  }

  save(payload: BrandingUpdate): Observable<Branding> {
    return this.http.put<Branding>(this.API_URL, payload, { withCredentials: true });
  }
}
