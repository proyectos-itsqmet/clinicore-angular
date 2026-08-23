import { Routes } from '@angular/router';

export const doctorRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./doctor-list.component').then(m => m.DoctorListComponent),
    title: 'Doctores · CliniCore',
  },
  {
    path: ':id',
    loadComponent: () => import('./doctor-detail.component').then(m => m.DoctorDetailComponent),
    title: 'Detalle de Doctor · CliniCore',
  }
];
