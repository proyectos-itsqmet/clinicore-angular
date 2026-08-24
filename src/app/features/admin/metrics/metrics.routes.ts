import type { Routes } from '@angular/router';

/**
 * Los seis destinos de métricas montan este mismo componente. Cuál de los seis
 * es lo decide `data.metricsView` en `admin.routes.ts`, no este archivo.
 */
export const metricsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./metrics-page.component').then((module) => module.MetricsPageComponent),
  },
];
