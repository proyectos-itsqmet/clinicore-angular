import { Routes } from '@angular/router';

export const preciosPromocionesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./precios-promociones-list.component').then((m) => m.PreciosPromocionesListComponent),
    title: 'Promociones · CliniCore',
  },
];
