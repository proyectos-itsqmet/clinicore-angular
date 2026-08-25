import type { Routes } from '@angular/router';

export const metricasPacientesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./metricas-pacientes.component').then((m) => m.MetricasPacientesComponent),
    title: 'Métricas de Pacientes · CliniCore',
  },
];
