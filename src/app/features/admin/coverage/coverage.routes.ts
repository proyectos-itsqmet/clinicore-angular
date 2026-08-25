import { Routes } from '@angular/router';

export const coverageRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./coverage-list.component').then((m) => m.CoverageListComponent),
    title: 'Planes de Cobertura · CliniCore',
  },
];
