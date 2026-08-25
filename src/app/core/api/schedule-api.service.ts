import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  GenerateSchedulesRequest,
  GenerateSchedulesFromTemplateRequest,
  ScheduleDTO,
  Page,
  CreateSchedulePayload,
} from '../models';

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
    serviceId?: number;
    from?: string;
    to?: string;
    status?: string;
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

    if (params.serviceId != null) {
      httpParams = httpParams.set('serviceId', params.serviceId.toString());
    }

    // `from`/`to`: a date RANGE, independent of and additive with `date`
    // (exact day) — mirrors the backend's `ScheduleController#getAll`, which
    // treats every filter as an AND predicate.
    if (params.from && params.from.trim()) {
      httpParams = httpParams.set('from', params.from.trim());
    }

    if (params.to && params.to.trim()) {
      httpParams = httpParams.set('to', params.to.trim());
    }

    if (params.status && params.status.trim()) {
      httpParams = httpParams.set('status', params.status.trim());
    }

    return this.http.get<Page<ScheduleDTO>>(this.API_URL, { params: httpParams, withCredentials: true });
  }

  generateSchedules(body: GenerateSchedulesRequest): Observable<ScheduleDTO[]> {
    return this.http.post<ScheduleDTO[]>(`${this.API_URL}/generate`, body, { withCredentials: true });
  }

  /**
   * Template-driven counterpart of {@link generateSchedules} —
   * "administracion/horarios". Reads whichever `ScheduleTemplate` applies to
   * each date's weekday over `[from, to]` instead of the caller repeating
   * `intervalMinutes`/a single `date`. Per-date blockers (holiday, doctor
   * time-off, no applicable template, slots already existing) are skipped by
   * the backend rather than aborting the whole period; if NOTHING was
   * produced across the whole range, the backend rejects with a real Spanish
   * message (`ScheduleService#generateSchedulesFromTemplates`) that callers
   * must surface verbatim, not replace with a generic fallback.
   */
  generateSchedulesFromTemplates(body: GenerateSchedulesFromTemplateRequest): Observable<ScheduleDTO[]> {
    return this.http.post<ScheduleDTO[]>(`${this.API_URL}/generate-from-template`, body, { withCredentials: true });
  }
}
