import type { Routes } from '@angular/router';

import { ADMIN_DEFAULT_PATH, ADMIN_NAV } from './admin-nav.data';

/**
 * The admin panel's route table, GENERATED from `ADMIN_NAV`.
 *
 * Not written out by hand, and that is the whole design: thirty-one
 * destinations declared twice — once as menu markup, once as routes — drift,
 * and the failure is silent (a menu item that 404s, or a page nothing links
 * to). One array, one loop, both derived.
 *
 * `data.crumb*` and `title` come along for free from the same entry, so the
 * layout's breadcrumb and the browser tab can never disagree with the menu
 * either.
 *
 * Every destination currently resolves to the SAME placeholder component. That
 * is deliberate for this step — the shell was the scope, the sections come
 * next — and replacing one is a one-line change: swap that route's
 * `loadComponent`. When a whole group gets real pages, hoist it to its own
 * `loadChildren` so it ships as its own chunk; splitting into twelve chunks now
 * would just be twelve copies of the same placeholder.
 */
const placeholder = () => import('./admin-placeholder-page').then((module) => module.AdminPlaceholderPage);

export const adminRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: ADMIN_DEFAULT_PATH },

  {
    path: 'administracion/establecimientos',
    loadChildren: () => import('./establishments/establishments.routes').then(m => m.establishmentRoutes),
    data: { crumbGroup: 'Admin', crumbLeaf: 'Gestor de establecimientos' }
  },
  {
    path: 'administracion/operadores',
    loadChildren: () => import('./operators/operators.routes').then(m => m.operatorRoutes),
    data: { crumbGroup: 'Admin', crumbLeaf: 'Operadores' }
  },
  {
    path: 'administracion/doctores',
    loadChildren: () => import('./doctors/doctors.routes').then(m => m.doctorRoutes),
    data: { crumbGroup: 'Admin', crumbLeaf: 'Doctores' }
  },
  {
    path: 'administracion/especialidades',
    loadChildren: () => import('./specialties/specialties.routes').then(m => m.specialtyRoutes),
    data: { crumbGroup: 'Admin', crumbLeaf: 'Servicios' }
  },
  {
    path: 'pacientes/informacion',
    loadChildren: () => import('./patients/patients.routes').then(m => m.patientRoutes),
    data: { crumbGroup: 'Pacientes', crumbLeaf: 'Información' }
  },

  ...ADMIN_NAV.flatMap((entry) => {
    if (entry.children.length === 0) {
      return [
        {
          path: entry.path,
          loadComponent: placeholder,
          data: { crumbGroup: 'Panel', crumbLeaf: entry.label },
          title: `${entry.label} · Panel · CliniCore`,
        },
      ];
    }

    const filteredChildren = entry.children.filter(child => {
      const fullPath = `${entry.path}/${child.path}`;
      return fullPath !== 'administracion/establecimientos' && 
             fullPath !== 'administracion/operadores' && 
             fullPath !== 'administracion/doctores' &&
             fullPath !== 'administracion/especialidades' &&
             fullPath !== 'pacientes/informacion';
    });

    return [
      { path: entry.path, pathMatch: 'full' as const, redirectTo: `${entry.path}/${entry.children[0].path}` },
      ...filteredChildren.map((child) => {
        const fullPath = `${entry.path}/${child.path}`;
        return {
          path: fullPath,
          loadComponent: placeholder,
          data: { crumbGroup: entry.label, crumbLeaf: child.label },
          title: `${child.label} · ${entry.label} · CliniCore`,
        };
      }),
    ];
  }),

  { path: '**', redirectTo: ADMIN_DEFAULT_PATH },
];
