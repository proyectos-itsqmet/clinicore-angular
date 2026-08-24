import { Routes } from '@angular/router';

export const specialtyRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./specialty-list.component').then(m => m.SpecialtyListComponent),
    title: 'Especialidades · CliniCore',
  },
  {
    path: ':id',
    loadComponent: () => import('./specialty-detail.component').then(m => m.SpecialtyDetailComponent),
    title: 'Detalle de Especialidad · CliniCore',
  }
];
