import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Page, Patient } from '../models';

@Injectable({ providedIn: 'root' })
export class PatientApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/patients';

  getAll(name?: string, ci?: string, page: number = 0, size: number = 10): Observable<Page<Patient>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (name && name.trim()) {
      params = params.set('name', name.trim());
    }

    if (ci && ci.trim()) {
      params = params.set('ci', ci.trim());
    }

    return this.http.get<Page<Patient>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
