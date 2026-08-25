import type { Routes } from '@angular/router';

export const dashboardAnalyticsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard-analytics.component').then((m) => m.DashboardAnalyticsComponent),
    title: 'Analytics · CliniCore',
  },
];
