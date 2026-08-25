import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { AdminModule } from '../models';

/**
 * `modulos` (`GET /api/admin-modules`, `PUT /api/admin-modules/{moduleKey}`).
 * Both tiers are `ROLE_ADMIN` on the backend — unlike every catalog GET this
 * codebase otherwise exposes to staff or the public, see
 * `AdminModuleController`'s own docblock for why.
 */
@Injectable({ providedIn: 'root' })
export class AdminModuleApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/admin-modules';

  /** Bare array, not `Page<T>` — fixed catalog of 12 rows, see `AdminModule`'s own docblock. */
  getAll(): Observable<AdminModule[]> {
    return this.http.get<AdminModule[]>(this.API_URL, { withCredentials: true });
  }

  setEnabled(moduleKey: string, enabled: boolean): Observable<AdminModule> {
    return this.http.put<AdminModule>(`${this.API_URL}/${moduleKey}`, { enabled }, { withCredentials: true });
  }
}
