import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { GenerateSchedulesRequest, ScheduleDTO, Page, CreateSchedulePayload } from '../models';

@Injectable({ providedIn: 'root' })
export class ScheduleApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/schedules';

  create(payload: CreateSchedulePayload): Observable<ScheduleDTO> {
    return this.http.post<ScheduleDTO>(`${this.API_URL}/create`, payload, { withCredentials: true });
  }

  getAll(params: {
    date?: string;
    stablishmentId?: number;
    doctorId?: string;
    doctorName?: string;
    page?: number;
    size?: number;
  } = {}): Observable<Page<ScheduleDTO>> {
    let httpParams = new HttpParams()
      .set('page', (params.page ?? 0).toString())
      .set('size', (params.size ?? 10).toString());

    if (params.date && params.date.trim()) {
      httpParams = httpParams.set('date', params.date.trim());
    }

    if (params.stablishmentId) {
      httpParams = httpParams.set('stablishmentId', params.stablishmentId.toString());
    }

    if (params.doctorId && params.doctorId.trim()) {
      httpParams = httpParams.set('doctorId', params.doctorId.trim());
    }

    if (params.doctorName && params.doctorName.trim()) {
      httpParams = httpParams.set('doctorName', params.doctorName.trim());
    }

    return this.http.get<Page<ScheduleDTO>>(this.API_URL, { params: httpParams, withCredentials: true });
  }

  generateSchedules(body: GenerateSchedulesRequest): Observable<ScheduleDTO[]> {
    return this.http.post<ScheduleDTO[]>(`${this.API_URL}/generate`, body, { withCredentials: true });
  }
}
