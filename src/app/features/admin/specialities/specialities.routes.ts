import type { Routes } from '@angular/router';

export const specialityRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./speciality-list.component').then((module) => module.SpecialityListComponent),
  },
];
