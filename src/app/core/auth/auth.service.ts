import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { tap, map, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

export interface LoginRequest {
  email?: string;
  ci?: string;
  password?: string;
}

export interface LoginResponse {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  message: string;
  jwtToken?: string;
}

export interface InitRegistrationRequest {
  email: string;
  ci: string;
}

export interface VerifyOtpRequest {
  otp: string;
}

export interface PatientRegistrationRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  ci: string;
  birthday: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  phone?: string;
  gender?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly BASE_AUTH_URL = 'http://localhost:8080/auth';

  readonly currentUser = signal<LoginResponse | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const stored = localStorage.getItem('clinicore_user');
        if (stored) {
          this.currentUser.set(JSON.parse(stored));
        }
      } catch {
        // Fallback silencioso
      }
    }
  }

  private saveUser(user: LoginResponse | null): void {
    this.currentUser.set(user);
    if (isPlatformBrowser(this.platformId)) {
      try {
        if (user) {
          localStorage.setItem('clinicore_user', JSON.stringify(user));
        } else {
          localStorage.removeItem('clinicore_user');
        }
      } catch {
        // Fallback silencioso
      }
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.BASE_AUTH_URL}/login-operator`, credentials, {
      withCredentials: true
    }).pipe(
      tap((response) => {
        this.saveUser(response);
      })
    );
  }

  loginPatient(credentials: { email?: string; ci?: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.BASE_AUTH_URL}/login-patient`, credentials, {
      withCredentials: true
    }).pipe(
      tap((response) => {
        this.saveUser(response);
      })
    );
  }

  initRegistrationPatient(body: InitRegistrationRequest): Observable<{ Message: string; email: string }> {
    return this.http.post<{ Message: string; email: string }>(
      `${this.BASE_AUTH_URL}/init-registration-patient`,
      body,
      { withCredentials: true }
    );
  }

  verifyRegistrationOtp(body: VerifyOtpRequest): Observable<{ Message: string; email: string }> {
    return this.http.post<{ Message: string; email: string }>(
      `${this.BASE_AUTH_URL}/verify-registration-otp`,
      body,
      { withCredentials: true }
    );
  }

  registerPatient(body: PatientRegistrationRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.BASE_AUTH_URL}/register-patient`,
      body,
      { withCredentials: true }
    ).pipe(
      tap((response) => {
        this.saveUser(response);
      })
    );
  }

  checkSession(): Observable<boolean> {
    return this.http.get<LoginResponse>(`${this.BASE_AUTH_URL}/me`, {
      withCredentials: true
    }).pipe(
      tap((response) => {
        this.saveUser(response);
      }),
      map(() => true),
      catchError(() => {
        // Si no hay sesión en backend, solo limpiar si no tenemos token en cookie
        if (!this.currentUser()) {
          this.saveUser(null);
        }
        return of(this.currentUser() !== null);
      })
    );
  }

  logout(): void {
    this.saveUser(null);
    this.http.post(`${this.BASE_AUTH_URL}/logout`, {}, {
      withCredentials: true
    }).pipe(
      catchError(() => of(null))
    ).subscribe();
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }
}
