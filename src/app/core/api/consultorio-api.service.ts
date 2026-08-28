import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Consultorio, ConsultorioWrite } from '../models';

@Injectable({ providedIn: 'root' })
export class ConsultorioApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api/consultorios';

  getByEstablishment(stablishmentId: number): Observable<Consultorio[]> {
    const params = new HttpParams().set('stablishmentId', stablishmentId.toString());
    return this.http.get<Consultorio[]>(this.API_URL, { params, withCredentials: true });
  }

  create(payload: ConsultorioWrite): Observable<Consultorio> {
    return this.http.post<Consultorio>(this.API_URL, payload, { withCredentials: true });
  }

  update(id: number, payload: ConsultorioWrite): Observable<Consultorio> {
    return this.http.put<Consultorio>(`${this.API_URL}/${id}`, payload, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
