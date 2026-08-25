import type { Routes } from '@angular/router';

export const reportesGeneralRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./reportes-general.component').then((m) => m.ReportesGeneralComponent),
    title: 'Reporte General de Turnos · CliniCore',
  },
];
