import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { API_BASE_URL } from '../api/api-base-url';

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

/**
 * La sesión del panel administrativo.
 *
 * ES UNA COOKIE, no un token en memoria. `POST /auth/login-operator` la deja
 * puesta y cada request la manda con `withCredentials: true`; el signal de acá
 * es solo una copia local de quién es el usuario, para no preguntar `/auth/me`
 * en cada navegación.
 *
 * Eso tiene una consecuencia que conviene saber antes de cablear el menú de
 * usuario: `logout()` no cierra la sesión de verdad. Ver su propio comentario.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Copia local del usuario autenticado. `null` = no sabemos todavía. */
  readonly currentUser = signal<LoginResponse | null>(null);

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/auth/login-operator`, credentials, {
        // Necesario para que el navegador acepte y guarde la cookie de sesión.
        withCredentials: true,
      })
      .pipe(tap((response) => this.currentUser.set(response)));
  }

  /**
   * Corta si ya sabemos quién es: `authGuard` corre en CADA navegación del panel
   * y sin este atajo cada clic del menú dispara un request contra `/auth/me`.
   */
  checkSession(): Observable<boolean> {
    if (this.currentUser()) {
      return of(true);
    }

    return this.http.get<LoginResponse>(`${this.baseUrl}/auth/me`, { withCredentials: true }).pipe(
      tap((response) => this.currentUser.set(response)),
      map(() => true),
      catchError(() => {
        this.currentUser.set(null);
        return of(false);
      }),
    );
  }

  /**
   * OJO: esto NO cierra la sesión, solo olvida quién era.
   *
   * La sesión vive en una cookie que pone el backend, así que borrar el signal
   * deja la cookie intacta: al recargar, `authGuard` pregunta `/auth/me`, el
   * backend responde que sí, y el usuario vuelve a estar adentro sin haber
   * ingresado. Hoy no duele porque el menú de usuario del shell todavía no está
   * cableado (ver `admin-layout.ts`), pero es un bug esperando el botón.
   *
   * El arreglo es del backend: un `POST /auth/logout` que responda con la cookie
   * expirada. No existe — `CookiesUtils` ya sabe construirla, así que es poco
   * trabajo, pero es trabajo del otro lado.
   */
  logout(): void {
    this.currentUser.set(null);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }
}
