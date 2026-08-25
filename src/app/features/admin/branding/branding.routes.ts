import { Routes } from '@angular/router';

export const brandingRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./branding-page.component').then((m) => m.BrandingPageComponent),
    title: 'Personalización · CliniCore',
  },
];
