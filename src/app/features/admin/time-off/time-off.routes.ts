import type { Routes } from '@angular/router';

/**
 * Vacaciones y Permisos son la MISMA pantalla montada dos veces: el `kind` sale
 * de `data.timeOffKind` en `admin.routes.ts`, no de dos componentes gemelos.
 * Este archivo solo carga el componente; quien decide cuál de las dos es, es la
 * ruta padre.
 */
export const timeOffRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./time-off-list.component').then((module) => module.TimeOffListComponent),
  },
];
