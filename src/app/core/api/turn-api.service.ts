import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Page, Turn, TurnFilterParams, TurnStatus } from '../models';

@Injectable({ providedIn: 'root' })
export class TurnApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/turns';

  getTurnsByPatient(patientId: string, filterParams: TurnFilterParams = {}): Observable<Page<Turn>> {
    let params = new HttpParams()
      .set('page', (filterParams.page ?? 0).toString())
      .set('size', (filterParams.size ?? 10).toString());

    if (filterParams.status && filterParams.status.trim()) {
      params = params.set('status', filterParams.status.trim());
    }

    if (filterParams.from && filterParams.from.trim()) {
      params = params.set('from', filterParams.from.trim());
    }

    if (filterParams.to && filterParams.to.trim()) {
      params = params.set('to', filterParams.to.trim());
    }

    if (filterParams.sort && filterParams.sort.trim()) {
      params = params.set('sort', filterParams.sort.trim());
    }

    return this.http.get<Page<Turn>>(`${this.API_URL}/patient/${patientId}`, {
      params,
      withCredentials: true
    });
  }

  getMyTurns(filterParams: TurnFilterParams = {}): Observable<Page<Turn>> {
    let params = new HttpParams()
      .set('page', (filterParams.page ?? 0).toString())
      .set('size', (filterParams.size ?? 10).toString());

    if (filterParams.status && filterParams.status.trim()) {
      params = params.set('status', filterParams.status.trim());
    }

    if (filterParams.from && filterParams.from.trim()) {
      params = params.set('from', filterParams.from.trim());
    }

    if (filterParams.to && filterParams.to.trim()) {
      params = params.set('to', filterParams.to.trim());
    }

    if (filterParams.sort && filterParams.sort.trim()) {
      params = params.set('sort', filterParams.sort.trim());
    }

    return this.http.get<Page<Turn>>(`${this.API_URL}/me`, {
      params,
      withCredentials: true
    });
  }

  getAll(filterParams: {
    stablishmentId?: number;
    doctorId?: string;
    serviceId?: number;
    date?: string;
    status?: TurnStatus | string;
    page?: number;
    size?: number;
    sort?: string;
  } = {}): Observable<Page<Turn>> {
    let params = new HttpParams()
      .set('page', (filterParams.page ?? 0).toString())
      .set('size', (filterParams.size ?? 10).toString());

    if (filterParams.stablishmentId != null) {
      params = params.set('stablishmentId', filterParams.stablishmentId.toString());
    }
    if (filterParams.doctorId && filterParams.doctorId.trim()) {
      params = params.set('doctorId', filterParams.doctorId.trim());
    }
    if (filterParams.serviceId != null) {
      params = params.set('serviceId', filterParams.serviceId.toString());
    }
    if (filterParams.date && filterParams.date.trim()) {
      params = params.set('date', filterParams.date.trim());
    }
    if (filterParams.status && String(filterParams.status).trim()) {
      params = params.set('status', String(filterParams.status).trim());
    }
    if (filterParams.sort && filterParams.sort.trim()) {
      params = params.set('sort', filterParams.sort.trim());
    }

    return this.http.get<Page<Turn>>(this.API_URL, {
      params,
      withCredentials: true
    });
  }

  create(payload: { schedule: { id: number } }): Observable<Turn> {
    return this.http.post<Turn>(this.API_URL, payload, { withCredentials: true });
  }

  createByStaff(payload: { schedule: { id: number }; patient: { uuid: string } }): Observable<Turn> {
    return this.http.post<Turn>(`${this.API_URL}/staff`, payload, { withCredentials: true });
  }

  cancelByStaff(id: number, reason?: string): Observable<Turn> {
    return this.http.put<Turn>(`${this.API_URL}/${id}/staff-cancel`, reason ? { reason } : {}, { withCredentials: true });
  }

  cancelMyTurn(id: number): Observable<Turn> {
    return this.http.put<Turn>(`${this.API_URL}/${id}/cancelled`, {}, { withCredentials: true });
  }

  reassign(id: number, scheduleId: number): Observable<Turn> {
    return this.http.put<Turn>(`${this.API_URL}/${id}/reassign`, { scheduleId }, { withCredentials: true });
  }

  markAsWaiting(id: number): Observable<Turn> {
    return this.http.put<Turn>(`${this.API_URL}/${id}/waiting`, {}, { withCredentials: true });
  }

  markAsInTreatment(id: number): Observable<Turn> {
    return this.http.put<Turn>(`${this.API_URL}/${id}/in-treatment`, {}, { withCredentials: true });
  }

  markAsTreated(id: number): Observable<Turn> {
    return this.http.put<Turn>(`${this.API_URL}/${id}/treated`, {}, { withCredentials: true });
  }
}
