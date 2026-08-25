import type { Routes } from '@angular/router';

export const historialClinicoRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./historial-clinico-list.component').then((m) => m.HistorialClinicoListComponent),
    title: 'Historial Clínico · CliniCore',
  },
];
