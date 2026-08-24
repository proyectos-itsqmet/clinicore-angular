import { Routes } from '@angular/router';

export const operatorRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./operator-list.component').then(m => m.OperatorListComponent),
    title: 'Operadores · CliniCore',
  },
  {
    path: ':id',
    loadComponent: () => import('./operator-detail.component').then(m => m.OperatorDetailComponent),
    title: 'Detalle de Operador · CliniCore',
  }
];
