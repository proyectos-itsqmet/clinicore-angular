import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import type { Page, AdminDoctor, DoctorCreate } from '../models';

@Injectable({ providedIn: 'root' })
export class DoctorApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = inject(API_BASE_URL) + '/api/doctors';

  getAll(page: number = 0, size: number = 10): Observable<Page<AdminDoctor>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    return this.http.get<Page<AdminDoctor>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: string): Observable<AdminDoctor> {
    return this.http.get<AdminDoctor>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  create(doctor: DoctorCreate): Observable<AdminDoctor> {
    return this.http.post<AdminDoctor>(`${this.API_URL}/register`, doctor, {
      withCredentials: true,
    });
  }

  update(id: string, doctor: DoctorCreate): Observable<AdminDoctor> {
    return this.http.put<AdminDoctor>(`${this.API_URL}/${id}`, doctor, { withCredentials: true });
  }

  assignToStablishment(doctorId: string, stablishmentId: number): Observable<AdminDoctor> {
    return this.http.post<AdminDoctor>(
      `${this.API_URL}/${doctorId}/stablishments/${stablishmentId}`,
      {},
      { withCredentials: true },
    );
  }

  assignToService(doctorId: string, serviceId: number): Observable<AdminDoctor> {
    return this.http.post<AdminDoctor>(
      `${this.API_URL}/${doctorId}/services/${serviceId}`,
      {},
      { withCredentials: true },
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
