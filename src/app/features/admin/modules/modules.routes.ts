import { Routes } from '@angular/router';

export const modulesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./modules-list.component').then((m) => m.ModulesListComponent),
    title: 'Módulos · CliniCore',
  },
];
