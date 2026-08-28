import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { AdminModule } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminModuleApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api/admin-modules';

  getAll(): Observable<AdminModule[]> {
    return this.http.get<AdminModule[]>(this.API_URL, { withCredentials: true });
  }

  setEnabled(moduleKey: string, enabled: boolean): Observable<AdminModule> {
    return this.http.put<AdminModule>(
      `${this.API_URL}/${moduleKey}`,
      { enabled },
      { withCredentials: true },
    );
  }
}
