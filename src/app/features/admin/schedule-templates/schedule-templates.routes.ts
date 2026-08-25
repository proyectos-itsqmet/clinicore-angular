import { Routes } from '@angular/router';

export const scheduleTemplatesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./schedule-template-list.component').then((m) => m.ScheduleTemplateListComponent),
    title: 'Horarios de Atención · Admin · CliniCore',
  },
];
