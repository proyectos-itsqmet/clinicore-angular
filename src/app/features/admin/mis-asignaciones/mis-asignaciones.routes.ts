import { Routes } from '@angular/router';

/**
 * Las dos secciones del médico, como DOS arreglos y no como un grupo con hijos.
 *
 * `admin.routes.ts` monta cada destino en su path COMPLETO (`grupo/hijo`), que
 * es la forma que usan todas las demás secciones — ver `time-offs.routes.ts`,
 * que exporta `vacacionesRoutes` y `permisosRoutes` por la misma razón.
 *
 * Antes esto era un único `loadChildren` montado en `mis-asignaciones` a secas,
 * y eso rompía dos invariantes que `admin.routes.spec.ts` verifica:
 *
 *   1. La tabla declaraba UN destino (`mis-asignaciones`) donde `ADMIN_NAV`
 *      declara DOS (`servicios`, `turnos`), así que la comparación entre el
 *      menú y las rutas no cerraba.
 *   2. El grupo se quedaba sin su redirect, porque el generador tenía que
 *      saltearlo con un caso especial para no pisar el `loadChildren`. Entrar
 *      a `/admin/mis-asignaciones` pelado no llevaba a ningún lado.
 *
 * Ambas cosas salían de la excepción, no del contenido. Sin la excepción, el
 * generador hace lo que hace con todos los demás grupos.
 */
export const misServiciosRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./servicios/mis-servicios-page').then((m) => m.MisServiciosPage),
    title: 'Mis Servicios · CliniCore',
    data: { crumbGroup: 'Mis Asignaciones', crumbLeaf: 'Mis Servicios' },
  },
];

export const misTurnosRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./turnos/mis-turnos-page').then((m) => m.MisTurnosPage),
    title: 'Mis Turnos · CliniCore',
    data: { crumbGroup: 'Mis Asignaciones', crumbLeaf: 'Mis Turnos' },
  },
];
