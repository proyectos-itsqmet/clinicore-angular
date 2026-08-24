import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { map } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  // Si se ejecuta en el servidor (SSR), Node.js no tiene las cookies del navegador.
  // Dejamos que pase la validación en el servidor. El cliente (navegador) re-ejecutará
  // esto al hidratar la página y hará la verdadera petición /auth/me con las cookies.
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  return authService.checkSession().pipe(
    map((isAuthenticated) => {
      if (isAuthenticated) {
        return true;
      }
      return router.createUrlTree(['/login']);
    }),
  );
};
