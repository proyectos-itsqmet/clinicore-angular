import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Encounter, EncounterCreate, Page } from '../models';

/**
 * `EncounterController` has no class-level `@RequestMapping` (routes span
 * both "/api/encounters/**" and "/api/patients/{id}/encounters"), so this
 * service builds each full path instead of a single resource-root `API_URL`.
 */
@Injectable({ providedIn: 'root' })
export class EncounterApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api';

  /** "pacientes/historial-clinico": `GET /api/patients/{patientId}/encounters`. */
  getHistoryForPatient(patientId: string, page: number = 0, size: number = 10): Observable<Page<Encounter>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<Page<Encounter>>(`${this.API_URL}/patients/${patientId}/encounters`, {
      params,
      withCredentials: true,
    });
  }

  getById(id: number): Observable<Encounter> {
    return this.http.get<Encounter>(`${this.API_URL}/encounters/${id}`, { withCredentials: true });
  }

  /** Only legal when the referenced turn is `TURN_TREATED` — enforced server-side, surfaced via the error message. */
  create(payload: EncounterCreate): Observable<Encounter> {
    return this.http.post<Encounter>(`${this.API_URL}/encounters`, payload, { withCredentials: true });
  }

  /** Correction only (reasonForVisit/clinicalNotes/diagnosis) — see `EncounterCreate` for why `turnId` must still be sent. */
  update(id: number, payload: EncounterCreate): Observable<Encounter> {
    return this.http.put<Encounter>(`${this.API_URL}/encounters/${id}`, payload, { withCredentials: true });
  }
}
