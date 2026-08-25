import type { Routes } from '@angular/router';

export const calendarioRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./calendario-list.component').then((m) => m.CalendarioListComponent),
    title: 'Calendario de Horarios · CliniCore',
  },
];
