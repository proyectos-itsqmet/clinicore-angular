import type { Routes } from '@angular/router';

export const turnRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./turn-list.component').then((module) => module.TurnListComponent),
  },
];
