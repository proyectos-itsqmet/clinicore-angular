import type { Routes } from '@angular/router';

/**
 * Titles and crumbs are INHERITED from the parent entry in `admin.routes.ts`,
 * which derives both from `ADMIN_NAV`. A leaf only declares them when it needs
 * something different, the way the doctors' detail route does.
 */
export const establishmentRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./establishment-list.component').then((module) => module.EstablishmentListComponent),
  },
];
