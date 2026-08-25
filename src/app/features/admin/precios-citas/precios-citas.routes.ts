import { Routes } from '@angular/router';

export const preciosCitasRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./precios-citas-list.component').then(m => m.PreciosCitasListComponent),
    title: 'Precios de Citas · CliniCore',
  },
];
