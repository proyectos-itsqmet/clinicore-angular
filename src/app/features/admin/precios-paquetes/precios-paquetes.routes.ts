import { Routes } from '@angular/router';

export const preciosPaquetesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./precios-paquetes-list.component').then((m) => m.PreciosPaquetesListComponent),
    title: 'Paquetes · CliniCore',
  },
];
