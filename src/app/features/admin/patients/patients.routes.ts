import { Routes } from '@angular/router';

export const patientRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./patient-list.component').then(m => m.PatientListComponent),
    title: 'Pacientes · CliniCore',
  },
  {
    path: ':id',
    loadComponent: () => import('./patient-detail.component').then(m => m.PatientDetailComponent),
    title: 'Detalle de Paciente · CliniCore',
  }
];
