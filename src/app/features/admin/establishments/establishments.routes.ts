import { Routes } from '@angular/router';

export const establishmentRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./establishment-list.component').then(m => m.EstablishmentListComponent),
    title: 'Establecimientos · CliniCore',
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./establishment-form.component').then(m => m.EstablishmentFormComponent),
    title: 'Nuevo Establecimiento · CliniCore',
  },
  {
    path: ':id',
    loadComponent: () => import('./establishment-form.component').then(m => m.EstablishmentFormComponent),
    title: 'Editar Establecimiento · CliniCore',
  },
];
