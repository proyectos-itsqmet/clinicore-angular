import { Routes } from '@angular/router';

export const reclamosRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./reclamos-list.component').then((m) => m.ReclamosListComponent),
    title: 'Reclamos · CliniCore',
  },
];
