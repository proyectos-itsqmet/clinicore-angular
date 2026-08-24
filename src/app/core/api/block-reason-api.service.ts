import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { BlockReason, BlockReasonCreate, BlockReasonKind, Page } from '../models';
import { API_BASE_URL } from './api-base-url';

/**
 * Catálogo de motivos de bloqueo — `/api/block-reasons`.
 *
 * `getActive(kind)` es lo que permite que Feriados, Vacaciones y Permisos
 * ofrezcan solo los motivos que les corresponden en vez de la lista entera: un
 * feriado no es un motivo válido para un permiso personal.
 *
 * Igual que las especialidades, `delete` DESACTIVA — hay ausencias apuntando a
 * estas filas.
 */
@Injectable({ providedIn: 'root' })
export class BlockReasonApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = inject(API_BASE_URL) + '/api/block-reasons';

  getAll(page: number = 0, size: number = 10): Observable<Page<BlockReason>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<Page<BlockReason>>(this.API_URL, { params, withCredentials: true });
  }

  /** Sin `kind` devuelve todos los activos; con `kind`, solo los de ese tipo. */
  getActive(kind?: BlockReasonKind): Observable<BlockReason[]> {
    let params = new HttpParams();
    if (kind) {
      params = params.set('kind', kind);
    }
    return this.http.get<BlockReason[]>(`${this.API_URL}/active`, {
      params,
      withCredentials: true,
    });
  }

  getById(id: number): Observable<BlockReason> {
    return this.http.get<BlockReason>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  create(reason: BlockReasonCreate): Observable<BlockReason> {
    return this.http.post<BlockReason>(this.API_URL, reason, { withCredentials: true });
  }

  update(id: number, reason: BlockReasonCreate): Observable<BlockReason> {
    return this.http.put<BlockReason>(`${this.API_URL}/${id}`, reason, { withCredentials: true });
  }

  /** Desactiva. Ver la nota de la clase. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
