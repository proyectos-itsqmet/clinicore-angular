import { inject } from '@angular/core';
import { Router, type CanActivateChildFn } from '@angular/router';
import { AuthService } from './auth.service';
import { ADMIN_NAV } from '../../features/admin/admin-nav.data';

export const roleGuard: CanActivateChildFn = (childRoute, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const user = authService.currentUser();
  if (!user) {
    return router.createUrlTree(['/login']);
  }

  // state.url is like "/admin/dashboard/resumen"
  const urlParts = state.url.split('?')[0].split('/').filter(Boolean);
  // urlParts = ["admin", "dashboard", "resumen"]
  if (urlParts.length < 2) return true; // Only /admin

  const groupPath = urlParts[1];
  const leafPath = urlParts.length > 2 ? urlParts.slice(2).join('/') : null;

  const entry = ADMIN_NAV.find(n => n.path === groupPath);
  if (!entry) return true; // Not found in nav, assume ok or handle otherwise

  let allowedRoles = entry.allowedRoles;
  
  if (leafPath) {
    const leaf = entry.children.find(c => c.path === leafPath);
    if (leaf && leaf.allowedRoles) {
      allowedRoles = leaf.allowedRoles;
    }
  }

  if (!allowedRoles || allowedRoles.length === 0) {
    return true; // No restrictions
  }

  if (allowedRoles.includes(user.role)) {
    return true;
  }

  // Unauthorized, maybe fallback to the user's dashboard based on role
  if (user.role === 'ROLE_DOCTOR') {
    return router.createUrlTree(['/admin/pacientes/historial-clinico']);
  } else if (user.role === 'ROLE_EMPLOYEE') {
    return router.createUrlTree(['/admin/turnos']);
  }

  return router.createUrlTree(['/admin/dashboard/resumen']);
};
