import type { Route, Routes } from '@angular/router';

import { ADMIN_DEFAULT_PATH, ADMIN_NAV } from './admin-nav.data';
import type { MetricsView } from './metrics/metrics-page.component';

/**
 * The admin panel's route table, GENERATED from `ADMIN_NAV`.
 *
 * Not written out by hand, and that is the whole design: thirty-three
 * destinations declared twice — once as menu markup, once as routes — drift,
 * and the failure is silent (a menu item that 404s, or a page nothing links
 * to). One array, one loop, both derived.
 *
 * `data.crumb*` and `title` come along for free from the same entry, so the
 * layout's breadcrumb and the browser tab can never disagree with the menu
 * either.
 *
 * SECTIONS THAT EXIST ARE ONE MAP, keyed by the same `group/leaf` path the loop
 * builds. Everything absent from it falls through to the placeholder. Adding a
 * section is a single line here.
 *
 * SOME SECTIONS SHARE A COMPONENT AND DIFFER ONLY IN `data`. Vacaciones and
 * Permisos are the same screen with a different `timeOffKind`; the six metrics
 * destinations are the same screen with a different `metricsView`. That is why
 * an entry can carry extra route data — the alternative is eight components that
 * differ by a string, and eight places to fix the same bug.
 */
const placeholder = () =>
  import('./admin-placeholder-page').then((module) => module.AdminPlaceholderPage);

type ChildRoutesLoader = () => Promise<Routes>;

interface ImplementedSection {
  readonly children: ChildRoutesLoader;
  /** Merged into the route's `data`, on top of the generated breadcrumb. */
  readonly data?: Record<string, unknown>;
}

/** Tarjetas y bloques de cada destino de métricas. Ver `MetricsPageComponent`. */
const METRICS_VIEWS: Readonly<Record<string, MetricsView>> = {
  resumen: {
    kicker: 'Dashboard',
    heading: 'Resumen general',
    description: 'El estado del sistema de un vistazo.',
    tiles: ['turnsToday', 'turnsPending', 'turnsTreated', 'schedulesFree'],
    showDaily: true,
    showByStatus: true,
  },
  analytics: {
    kicker: 'Dashboard',
    heading: 'Analytics',
    description: 'Cómo se distribuyen los turnos en el tiempo y por estado.',
    tiles: ['turnsTotal', 'turnsTreated', 'turnsCancelled', 'activePatients'],
    showDaily: true,
    showByStatus: true,
  },
  establecimientos: {
    kicker: 'Métricas',
    heading: 'Establecimientos',
    description: 'Carga de turnos por sede.',
    tiles: ['totalStablishments', 'turnsTotal', 'schedulesFree'],
    showByStablishment: true,
  },
  empleados: {
    kicker: 'Métricas',
    heading: 'Empleados',
    description: 'Carga de turnos por profesional.',
    tiles: ['totalDoctors', 'totalOperators', 'turnsTotal', 'turnsTreated'],
    showByDoctor: true,
  },
  pacientes: {
    kicker: 'Métricas',
    heading: 'Pacientes',
    description: 'Cuántos pacientes hay y cuántos usaron el sistema en el período.',
    tiles: ['totalPatients', 'activePatients', 'turnsTotal', 'turnsCancelled'],
    showDaily: true,
  },
  general: {
    kicker: 'Reportes',
    heading: 'General',
    description: 'Todo junto: totales, evolución diaria y los dos agrupamientos.',
    tiles: [
      'turnsTotal',
      'turnsTreated',
      'turnsCancelled',
      'turnsPending',
      'totalPatients',
      'activePatients',
      'totalDoctors',
      'totalStablishments',
    ],
    showDaily: true,
    showByStatus: true,
    showByStablishment: true,
    showByDoctor: true,
  },
};

const metrics = (key: string): ImplementedSection => ({
  children: () => import('./metrics/metrics.routes').then((module) => module.metricsRoutes),
  data: { metricsView: METRICS_VIEWS[key] },
});

const IMPLEMENTED: Readonly<Record<string, ImplementedSection>> = {
  // ---- Admin: los cuatro CRUD que ya existían ----
  'administracion/establecimientos': {
    children: () =>
      import('./establishments/establishments.routes').then((m) => m.establishmentRoutes),
  },
  'administracion/operadores': {
    children: () => import('./operators/operators.routes').then((m) => m.operatorRoutes),
  },
  'administracion/doctores': {
    children: () => import('./doctors/doctors.routes').then((m) => m.doctorRoutes),
  },
  // `servicios` administra `services` (nombre y precio) y `especialidades` el
  // catálogo médico. Antes estaban cruzadas: la primera vivía en el segmento de
  // la segunda. Los nombres de carpeta siguen la misma corrección —
  // `services/` y `specialities/`, no `specialties/`.
  'administracion/servicios': {
    children: () => import('./services/services.routes').then((m) => m.serviceRoutes),
  },
  'administracion/especialidades': {
    children: () => import('./specialities/specialities.routes').then((m) => m.specialityRoutes),
  },

  // ---- Métricas: seis destinos, un componente ----
  'dashboard/resumen': metrics('resumen'),
  'dashboard/analytics': metrics('analytics'),
  'metricas/establecimientos': metrics('establecimientos'),
  'metricas/empleados': metrics('empleados'),
  'metricas/pacientes': metrics('pacientes'),
  'reportes/general': metrics('general'),

  // ---- Bloqueo de citas ----
  'bloqueo-de-citas/feriados': {
    children: () => import('./holidays/holidays.routes').then((m) => m.holidayRoutes),
  },
  'bloqueo-de-citas/motivos': {
    children: () => import('./block-reasons/block-reasons.routes').then((m) => m.blockReasonRoutes),
  },
  // Las dos siguientes son EL MISMO componente. Lo único que cambia es el `kind`.
  'bloqueo-de-citas/vacaciones': {
    children: () => import('./time-off/time-off.routes').then((m) => m.timeOffRoutes),
    data: { timeOffKind: 'TIMEOFF_VACATION' },
  },
  'bloqueo-de-citas/permisos': {
    children: () => import('./time-off/time-off.routes').then((m) => m.timeOffRoutes),
    data: { timeOffKind: 'TIMEOFF_PERMISSION' },
  },

  // ---- Operación ----
  turnos: { children: () => import('./turns/turns.routes').then((m) => m.turnRoutes) },
  calendario: {
    children: () => import('./calendar/calendar.routes').then((m) => m.calendarRoutes),
  },
  'pacientes/informacion': {
    children: () => import('./patients/patients.routes').then((m) => m.patientRoutes),
  },

  // NO está `precios/citas` a propósito, aunque el backend lo soporte hoy: sus
  // datos son `services.price`, exactamente la misma tabla que administra
  // Admin → Servicios. Montar un segundo CRUD sobre las mismas filas es crear
  // dos pantallas que pueden decir cosas distintas del mismo precio. Si Precios
  // necesita una vista propia, que sea de solo lectura y se decida como tal.
};

/**
 * One destination. `loadChildren` when the section is built, the shared
 * placeholder when it is not — same path, same crumbs, same title either way.
 *
 * The route stays COMPONENTLESS in the `loadChildren` case, which is what lets
 * its `data` reach the child that actually renders: Angular's default
 * `emptyOnly` inheritance passes a parent's data down through a componentless
 * route, and `admin-layout` reads the crumb off the DEEPEST activated snapshot.
 * The same inheritance is what carries `metricsView` and `timeOffKind`.
 */
function destination(path: string, group: string, leaf: string): Route {
  const section = IMPLEMENTED[path];
  const shared = {
    path,
    title: `${leaf} · ${group} · CliniCore`,
  };

  if (!section) {
    return { ...shared, data: { crumbGroup: group, crumbLeaf: leaf }, loadComponent: placeholder };
  }

  return {
    ...shared,
    data: { crumbGroup: group, crumbLeaf: leaf, ...section.data },
    loadChildren: section.children,
  };
}

export const adminRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: ADMIN_DEFAULT_PATH },

  ...ADMIN_NAV.flatMap((entry): Routes => {
    // An empty `children` is what makes a row a direct link — see admin-nav.data.ts.
    if (entry.children.length === 0) {
      return [destination(entry.path, 'Panel', entry.label)];
    }

    return [
      {
        path: entry.path,
        pathMatch: 'full' as const,
        redirectTo: `${entry.path}/${entry.children[0].path}`,
      },
      ...entry.children.map((child) =>
        destination(`${entry.path}/${child.path}`, entry.label, child.label),
      ),
    ];
  }),

  { path: '**', redirectTo: ADMIN_DEFAULT_PATH },
];
