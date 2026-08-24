import type { Routes } from '@angular/router';

export const patientRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./patient-list.component').then((module) => module.PatientListComponent),
  },
];
