import type { Routes } from '@angular/router';

export const doctorRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./doctor-list.component').then((module) => module.DoctorListComponent),
  },
  {
    // The one leaf that overrides its inherited crumb and title: the parent's
    // say "Doctores", and a detail page is not the list.
    path: ':id',
    loadComponent: () =>
      import('./doctor-detail.component').then((module) => module.DoctorDetailComponent),
    data: { crumbGroup: 'Doctores', crumbLeaf: 'Detalle del doctor' },
    title: 'Detalle del doctor · Doctores · CliniCore',
  },
];
