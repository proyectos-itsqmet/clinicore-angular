import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Consultorio, ConsultorioWrite } from '../models';

/**
 * `/api/consultorios` — the per-site consulting-room catalogue.
 *
 * Writes are ROLE_ADMIN (enforced in `GlobalConfig`, not by `@PreAuthorize`):
 * an administrator assigns the room, a doctor cannot assign their own. Reads
 * are open to any authenticated user because the operator needs the list when
 * calling a turn, and an operator is not an admin.
 */
@Injectable({ providedIn: 'root' })
export class ConsultorioApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/consultorios';

  /**
   * There is no "list every room" call by design: a room without its site is
   * meaningless, since the same "03" exists at several sites.
   */
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

  /** 400 with a Spanish message if a schedule template still references it — deactivate instead. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
