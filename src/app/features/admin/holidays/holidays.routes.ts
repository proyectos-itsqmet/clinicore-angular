import { Routes } from '@angular/router';

export const holidayRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./holiday-list.component').then((m) => m.HolidayListComponent),
    title: 'Días Feriados · CliniCore',
  },
];
