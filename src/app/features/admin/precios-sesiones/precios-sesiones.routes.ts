import { Routes } from '@angular/router';

export const preciosSesionesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./precios-sesiones-list.component').then((m) => m.PreciosSesionesListComponent),
    title: 'Sesiones · CliniCore',
  },
];
