import type { Routes } from '@angular/router';

export const auditoriaHcRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./auditoria-hc-list.component').then((m) => m.AuditoriaHcListComponent),
    title: 'Auditoría de Historias Clínicas · CliniCore',
  },
];
