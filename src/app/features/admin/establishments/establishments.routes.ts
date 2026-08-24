import { Routes } from '@angular/router';

export const establishmentRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./establishment-list.component').then(m => m.EstablishmentListComponent),
    title: 'Establecimientos · CliniCore',
  },
  {
    path: ':id',
    loadComponent: () => import('./establishment-detail.component').then(m => m.EstablishmentDetailComponent),
    title: 'Detalle de Establecimiento · CliniCore',
  }
];
