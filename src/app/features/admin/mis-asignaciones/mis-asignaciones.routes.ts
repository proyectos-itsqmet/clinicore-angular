import { Routes } from '@angular/router';

export const misAsignacionesRoutes: Routes = [
  {
    path: 'servicios',
    loadComponent: () => import('./servicios/mis-servicios-page').then((m) => m.MisServiciosPage),
    title: 'Mis Servicios · CliniCore',
    data: { crumbGroup: 'Mis Asignaciones', crumbLeaf: 'Mis Servicios' },
  },
  {
    path: 'turnos',
    loadComponent: () => import('./turnos/mis-turnos-page').then((m) => m.MisTurnosPage),
    title: 'Mis Turnos · CliniCore',
    data: { crumbGroup: 'Mis Asignaciones', crumbLeaf: 'Mis Turnos' },
  },
];
