import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Page, Operator, OperatorCreate } from '../models';

@Injectable({ providedIn: 'root' })
export class OperatorApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/operators';

  getAll(page: number = 0, size: number = 10): Observable<Page<Operator>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
      
    return this.http.get<Page<Operator>>(this.API_URL, { params, withCredentials: true });
  }

  getById(id: string): Observable<Operator> {
    return this.http.get<Operator>(`${this.API_URL}/${id}`, { withCredentials: true });
  }

  create(operator: OperatorCreate): Observable<Operator> {
    return this.http.post<Operator>(`${this.API_URL}/register`, operator, { withCredentials: true });
  }

  update(id: string, operator: OperatorCreate): Observable<Operator> {
    return this.http.put<Operator>(`${this.API_URL}/${id}`, operator, { withCredentials: true });
  }

  assignToStablishment(operatorId: string, stablishmentId: number): Observable<Operator> {
    return this.http.post<Operator>(`${this.API_URL}/${operatorId}/stablishments/${stablishmentId}`, {}, { withCredentials: true });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
