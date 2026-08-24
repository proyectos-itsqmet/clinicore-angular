import type { Routes } from '@angular/router';

export const operatorRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./operator-list.component').then((module) => module.OperatorListComponent),
  },
];
