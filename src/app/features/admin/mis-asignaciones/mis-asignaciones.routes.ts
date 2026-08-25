import { Routes } from '@angular/router';

export const misAsignacionesRoutes: Routes = [
  {
    path: 'servicios',
    loadComponent: () => import('./servicios/mis-servicios-page').then((m) => m.MisServiciosPage),
    title: 'Mis Servicios · CliniCore'
  }
];
