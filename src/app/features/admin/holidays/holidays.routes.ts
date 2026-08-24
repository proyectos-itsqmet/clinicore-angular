import type { Routes } from '@angular/router';

export const holidayRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./holiday-list.component').then((module) => module.HolidayListComponent),
  },
];
