import type { Routes } from '@angular/router';

export const metricasEmpleadosRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./metricas-empleados.component').then((m) => m.MetricasEmpleadosComponent),
    title: 'Métricas de Empleados · CliniCore',
  },
];
