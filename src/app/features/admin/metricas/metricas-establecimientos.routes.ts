import type { Routes } from '@angular/router';

export const metricasEstablecimientosRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./metricas-establecimientos.component').then((m) => m.MetricasEstablecimientosComponent),
    title: 'Métricas de Establecimientos · CliniCore',
  },
];
