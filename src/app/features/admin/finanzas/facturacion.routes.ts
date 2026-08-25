import { Routes } from '@angular/router';

export const facturacionRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./facturacion-list.component').then((m) => m.FacturacionListComponent),
    title: 'Facturación · CliniCore',
  },
  {
    path: ':id',
    loadComponent: () => import('./factura-detail.component').then((m) => m.FacturaDetailComponent),
    title: 'Detalle de Factura · CliniCore',
  },
];
