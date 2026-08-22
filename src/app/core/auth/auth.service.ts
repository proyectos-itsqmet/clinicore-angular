import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, map, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

export interface LoginRequest {
  email?: string;
  password?: string;
}

export interface LoginResponse {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/auth/login-operator';

  // Usamos un signal para mantener el estado global del usuario autenticado
  readonly currentUser = signal<LoginResponse | null>(null);

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.API_URL, credentials, {
      withCredentials: true // Necesario para que el backend pueda setear la cookie
    }).pipe(
      tap((response) => {
        this.currentUser.set(response);
      })
    );
  }

  checkSession(): Observable<boolean> {
    if (this.currentUser()) {
      return of(true);
    }
    return this.http.get<LoginResponse>('http://localhost:8080/auth/me', {
      withCredentials: true
    }).pipe(
      tap((response) => this.currentUser.set(response)),
      map(() => true),
      catchError(() => {
        this.currentUser.set(null);
        return of(false);
      })
    );
  }

  logout(): void {
    // TODO: Llamar al endpoint de logout si existe
    this.currentUser.set(null);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }
}
