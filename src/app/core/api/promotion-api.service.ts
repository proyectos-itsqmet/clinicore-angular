import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Page, Promotion, PromotionCreate } from '../models';

/** `GET/POST/PUT/DELETE /api/promotions` — "precios/promociones". GET (bare list) is public; writes require ROLE_ADMIN (GlobalConfig). */
@Injectable({ providedIn: 'root' })
export class PromotionApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/promotions';

  getAll(page: number = 0, size: number = 10, servicioId?: number): Observable<Page<Promotion>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (servicioId != null) {
      params = params.set('servicioId', servicioId.toString());
    }

    return this.http.get<Page<Promotion>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: number): Observable<Promotion> {
    return this.http.get<Promotion>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  create(payload: PromotionCreate): Observable<Promotion> {
    return this.http.post<Promotion>(`${this.API_URL}/save`, payload, { withCredentials: true });
  }

  update(id: number, payload: PromotionCreate): Observable<Promotion> {
    return this.http.put<Promotion>(`${this.API_URL}/${id}`, payload, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
