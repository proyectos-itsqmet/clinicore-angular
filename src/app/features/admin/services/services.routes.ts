import type { Routes } from '@angular/router';

export const serviceRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./service-list.component').then((module) => module.ServiceListComponent),
  },
];
