import { Routes } from '@angular/router';
import type { TimeOffKind } from '../../../core/models';

/**
 * Builds the (single-route) lazy chunk for one `TimeOffKind`. `vacaciones`
 * and `permisos` load the SAME component — see `time-off-list.component.ts`
 * for why one parameterised screen was chosen over two near-duplicates —
 * with `kind` carried in route `data`, inherited by this `path: ''` child
 * from its component-less parent entry in `admin.routes.ts` (same
 * `emptyOnly` inheritance every other admin section already relies on for
 * `crumbGroup`/`crumbLeaf`).
 */
function buildTimeOffRoutes(kind: TimeOffKind, title: string): Routes {
  return [
    {
      path: '',
      loadComponent: () => import('./time-off-list.component').then((m) => m.TimeOffListComponent),
      title: `${title} · CliniCore`,
      data: { kind },
    },
  ];
}

export const vacacionesRoutes: Routes = buildTimeOffRoutes('KIND_VACATION', 'Vacaciones');
export const permisosRoutes: Routes = buildTimeOffRoutes('KIND_PERMISSION', 'Permisos');
