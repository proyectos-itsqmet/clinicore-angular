import { Routes } from '@angular/router';

export const specialtyRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./specialty-list.component').then(m => m.SpecialtyListComponent),
    title: 'Especialidades · CliniCore',
  }
];
