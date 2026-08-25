import type { Routes } from '@angular/router';

export const recetasRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./receta-list.component').then((m) => m.RecetaListComponent),
    title: 'Recetas · CliniCore',
  },
];
