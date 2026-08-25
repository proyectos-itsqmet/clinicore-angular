import type { Routes } from '@angular/router';

export const dashboardResumenRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard-resumen.component').then((m) => m.DashboardResumenComponent),
    title: 'Resumen General · CliniCore',
  },
];
