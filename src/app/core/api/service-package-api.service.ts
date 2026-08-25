import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Page, ServicePackage, ServicePackageCreate } from '../models';

/** `GET/POST/PUT/DELETE /api/packages` — "precios/paquetes". GET (bare list) is public; writes require ROLE_ADMIN (GlobalConfig). */
@Injectable({ providedIn: 'root' })
export class ServicePackageApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/packages';

  getAll(page: number = 0, size: number = 10, name?: string): Observable<Page<ServicePackage>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (name) {
      params = params.set('name', name);
    }

    return this.http.get<Page<ServicePackage>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: number): Observable<ServicePackage> {
    return this.http.get<ServicePackage>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  create(payload: ServicePackageCreate): Observable<ServicePackage> {
    return this.http.post<ServicePackage>(`${this.API_URL}/save`, payload, { withCredentials: true });
  }

  update(id: number, payload: ServicePackageCreate): Observable<ServicePackage> {
    return this.http.put<ServicePackage>(`${this.API_URL}/${id}`, payload, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
