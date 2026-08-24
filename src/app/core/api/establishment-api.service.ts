import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import type { Page, Establishment, EstablishmentCreate } from '../models';

@Injectable({ providedIn: 'root' })
export class EstablishmentApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = inject(API_BASE_URL) + '/api/stablishments';

  getAll(page: number = 0, size: number = 10): Observable<Page<Establishment>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    return this.http.get<Page<Establishment>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: number): Observable<Establishment> {
    return this.http.get<Establishment>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  create(establishment: EstablishmentCreate): Observable<Establishment> {
    return this.http.post<Establishment>(`${this.API_URL}/save`, establishment, {
      withCredentials: true,
    });
  }

  update(id: number, establishment: EstablishmentCreate): Observable<Establishment> {
    return this.http.put<Establishment>(`${this.API_URL}/${id}`, establishment, {
      withCredentials: true,
    });
  }

  assignService(id: number, serviceId: number): Observable<Establishment> {
    return this.http.post<Establishment>(
      `${this.API_URL}/${id}/services/${serviceId}`,
      {},
      { withCredentials: true },
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
