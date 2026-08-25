import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { PatientCoverage, PatientCoverageCreate } from '../models';

/**
 * Staff-facing surface of `PatientCoverageController` (Backend_QMS): assigning
 * and managing ONE patient's insurance policy record from `patient-detail`.
 * Deliberately does NOT wrap `/api/patient-coverages/me` or
 * `.../me/quote` — those back the patient-facing app, not this admin panel.
 *
 * ROLE_EMPLOYEE/ROLE_ADMIN only — ROLE_DOCTOR is excluded (insurance/billing
 * is front-desk work here, not clinical) and gets a real HTTP 403 from the
 * coarse Spring Security gate. Callers should check that with
 * `isPermissionDeniedError` (`metrics-shared/turn-status.util.ts`).
 */
@Injectable({ providedIn: 'root' })
export class PatientCoverageApiService {
  private readonly http = inject(HttpClient);
  private readonly PATIENTS_URL = 'http://localhost:8080/api/patients';
  private readonly API_URL = 'http://localhost:8080/api/patient-coverages';

  /** `GET /api/patients/{patientId}/coverages` — this patient's full coverage history, most recent `validFrom` first. */
  getForPatient(patientId: string): Observable<PatientCoverage[]> {
    return this.http.get<PatientCoverage[]>(`${this.PATIENTS_URL}/${patientId}/coverages`, { withCredentials: true });
  }

  /** `POST /api/patient-coverages` — NOTE: no `/save` suffix here, unlike Insurer/CoveragePlan/Holiday. */
  create(payload: PatientCoverageCreate): Observable<PatientCoverage> {
    return this.http.post<PatientCoverage>(this.API_URL, payload, { withCredentials: true });
  }

  update(id: number, payload: PatientCoverageCreate): Observable<PatientCoverage> {
    return this.http.put<PatientCoverage>(`${this.API_URL}/${id}`, payload, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
