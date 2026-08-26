import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Insurer, InsurerCreate, Page } from '../models';

/** `GET/POST/PUT/DELETE /api/insurers` — writes require ROLE_ADMIN (GlobalConfig); reads are open to any authenticated role. */
@Injectable({ providedIn: 'root' })
export class InsurerApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api/insurers';

  getAll(page: number = 0, size: number = 10, name?: string): Observable<Page<Insurer>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (name && name.trim()) {
      params = params.set('name', name.trim());
    }

    return this.http.get<Page<Insurer>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: number): Observable<Insurer> {
    return this.http.get<Insurer>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  create(payload: InsurerCreate): Observable<Insurer> {
    return this.http.post<Insurer>(`${this.API_URL}/save`, payload, { withCredentials: true });
  }

  update(id: number, payload: InsurerCreate): Observable<Insurer> {
    return this.http.put<Insurer>(`${this.API_URL}/${id}`, payload, { withCredentials: true });
  }

  /** Backend rejects this with a message when the insurer still has coverage plans (`InsurerService#delete`) — surface `err.error.message` verbatim, do not swallow it into a generic error. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
