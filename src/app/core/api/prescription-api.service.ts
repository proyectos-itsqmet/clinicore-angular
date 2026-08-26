import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Page, Prescription, PrescriptionCreate } from '../models';

/**
 * `PrescriptionController` has no class-level `@RequestMapping` either (same
 * shape as `EncounterController`), and no update/delete route at all — a
 * `Prescription` is immutable once issued. See `PrescriptionCreate`.
 */
@Injectable({ providedIn: 'root' })
export class PrescriptionApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api';

  /** "pacientes/recetas": `GET /api/patients/{patientId}/prescriptions`. */
  getHistoryForPatient(patientId: string, page: number = 0, size: number = 10): Observable<Page<Prescription>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<Page<Prescription>>(`${this.API_URL}/patients/${patientId}/prescriptions`, {
      params,
      withCredentials: true,
    });
  }

  getById(id: number): Observable<Prescription> {
    return this.http.get<Prescription>(`${this.API_URL}/prescriptions/${id}`, { withCredentials: true });
  }

  /** No `update()`: a correction is always a new `create()` call — see `Prescription` model. */
  create(payload: PrescriptionCreate): Observable<Prescription> {
    return this.http.post<Prescription>(`${this.API_URL}/prescriptions`, payload, { withCredentials: true });
  }
}
