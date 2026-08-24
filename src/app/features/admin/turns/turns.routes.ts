import type { Routes } from '@angular/router';
import { TurnListComponent } from './turn-list.component';

export const turnRoutes: Routes = [
  {
    path: '',
    component: TurnListComponent,
    title: 'Gestión de Turnos · CliniCore',
  },
];
