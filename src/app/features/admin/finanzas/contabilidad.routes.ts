import { Routes } from '@angular/router';

export const contabilidadRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./contabilidad.component').then((m) => m.ContabilidadComponent),
    title: 'Contabilidad · CliniCore',
  },
];
