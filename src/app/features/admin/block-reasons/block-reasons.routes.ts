import { Routes } from '@angular/router';

export const blockReasonRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./block-reason-list.component').then((m) => m.BlockReasonListComponent),
    title: 'Motivos de Bloqueo · CliniCore',
  },
];
