import type { Routes } from '@angular/router';

export const blockReasonRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./block-reason-list.component').then((module) => module.BlockReasonListComponent),
  },
];
