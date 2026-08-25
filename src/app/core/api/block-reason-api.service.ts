import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { BlockReason, BlockReasonCreate, Page } from '../models';

@Injectable({ providedIn: 'root' })
export class BlockReasonApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/block-reasons';

  getAll(page: number = 0, size: number = 10, description?: string): Observable<Page<BlockReason>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (description && description.trim()) {
      params = params.set('description', description.trim());
    }

    return this.http.get<Page<BlockReason>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: number): Observable<BlockReason> {
    return this.http.get<BlockReason>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  create(payload: BlockReasonCreate): Observable<BlockReason> {
    return this.http.post<BlockReason>(`${this.API_URL}/save`, payload, { withCredentials: true });
  }

  update(id: number, payload: BlockReasonCreate): Observable<BlockReason> {
    return this.http.put<BlockReason>(`${this.API_URL}/${id}`, payload, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
