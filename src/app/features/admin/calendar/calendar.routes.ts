import type { Routes } from '@angular/router';

export const calendarRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./calendar-page.component').then((module) => module.CalendarPageComponent),
  },
];
