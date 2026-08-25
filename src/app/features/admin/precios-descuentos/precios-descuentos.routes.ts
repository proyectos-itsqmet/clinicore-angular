import { Routes } from '@angular/router';

export const preciosDescuentosRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./precios-descuentos-list.component').then((m) => m.PreciosDescuentosListComponent),
    title: 'Descuentos · CliniCore',
  },
];
