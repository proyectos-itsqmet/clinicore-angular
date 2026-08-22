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
  },

  ...ADMIN_NAV.flatMap((entry) => {
    // A row with no children is a destination itself, not a container.
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

    return [
      // Landing on a group with no leaf goes to its first child rather than
      // rendering an empty frame: a group is a container, never a page.
      { path: entry.path, pathMatch: 'full' as const, redirectTo: `${entry.path}/${entry.children[0].path}` },
      ...entry.children.map((child) => ({
        path: `${entry.path}/${child.path}`,
        loadComponent: placeholder,
        data: { crumbGroup: entry.label, crumbLeaf: child.label },
        title: `${child.label} · ${entry.label} · CliniCore`,
      })),
    ];
  }),

  // Anything else under /admin is a typo or a stale link, and a blank frame is
  // the worst possible answer. Send it home.
  { path: '**', redirectTo: ADMIN_DEFAULT_PATH },
];
