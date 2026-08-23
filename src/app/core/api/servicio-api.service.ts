import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Page, Servicio, ServicioCreate } from '../models';

@Injectable({ providedIn: 'root' })
export class ServicioApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/services';

  getAll(page: number = 0, size: number = 10): Observable<Page<Servicio>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
      
    return this.http.get<Page<Servicio>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: number): Observable<Servicio> {
    return this.http.get<Servicio>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  create(servicio: ServicioCreate): Observable<Servicio> {
    return this.http.post<Servicio>(this.API_URL, servicio, { withCredentials: true });
  }

  update(id: number, servicio: ServicioCreate): Observable<Servicio> {
    return this.http.put<Servicio>(`${this.API_URL}/${id}`, servicio, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
