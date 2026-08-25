import type { Routes } from '@angular/router';

import { ADMIN_DEFAULT_PATH, ADMIN_NAV } from './admin-nav.data';

/**
 * The admin panel's route table, GENERATED from `ADMIN_NAV`.
 *
 * Not written out by hand, and that is the whole design: thirty-two
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
  {
    path: '',
    pathMatch: 'full',
    redirectTo: ADMIN_DEFAULT_PATH,
  },
  {
    path: 'perfil',
    loadComponent: () => import('./profile/admin-profile.component').then(m => m.AdminProfileComponent),
    data: { crumbGroup: 'Ajustes', crumbLeaf: 'Mi Perfil' },
    title: 'Mi Perfil - CliniCore'
  },
  {
    path: 'dashboard/resumen',
    loadChildren: () => import('./dashboard/dashboard-resumen.routes').then(m => m.dashboardResumenRoutes),
    data: { crumbGroup: 'Dashboard', crumbLeaf: 'Resumen general' }
  },
  {
    path: 'dashboard/analytics',
    loadChildren: () => import('./dashboard/dashboard-analytics.routes').then(m => m.dashboardAnalyticsRoutes),
    data: { crumbGroup: 'Dashboard', crumbLeaf: 'Analytics' }
  },
  {
    path: 'metricas/establecimientos',
    loadChildren: () => import('./metricas/metricas-establecimientos.routes').then(m => m.metricasEstablecimientosRoutes),
    data: { crumbGroup: 'Métricas', crumbLeaf: 'Establecimientos' }
  },
  {
    path: 'metricas/empleados',
    loadChildren: () => import('./metricas/metricas-empleados.routes').then(m => m.metricasEmpleadosRoutes),
    data: { crumbGroup: 'Métricas', crumbLeaf: 'Empleados' }
  },
  {
    path: 'metricas/pacientes',
    loadChildren: () => import('./metricas/metricas-pacientes.routes').then(m => m.metricasPacientesRoutes),
    data: { crumbGroup: 'Métricas', crumbLeaf: 'Pacientes' }
  },
  {
    path: 'modulos',
    loadChildren: () => import('./modules/modules.routes').then(m => m.modulesRoutes),
    data: { crumbGroup: 'Panel', crumbLeaf: 'Módulos' }
  },
  {
    path: 'personalizacion',
    loadChildren: () => import('./branding/branding.routes').then(m => m.brandingRoutes),
    data: { crumbGroup: 'Panel', crumbLeaf: 'Personalización' }
  },
  {
    path: 'reportes/general',
    loadChildren: () => import('./reportes/reportes-general.routes').then(m => m.reportesGeneralRoutes),
    data: { crumbGroup: 'Reportes', crumbLeaf: 'General' }
  },
  {
    path: 'reportes/auditoria-hc',
    loadChildren: () => import('./reportes/auditoria-hc.routes').then(m => m.auditoriaHcRoutes),
    data: { crumbGroup: 'Reportes', crumbLeaf: 'Auditoría HC' }
  },
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
    path: 'administracion/planes-de-cobertura',
    loadChildren: () => import('./coverage/coverage.routes').then(m => m.coverageRoutes),
    data: { crumbGroup: 'Admin', crumbLeaf: 'Planes de cobertura' }
  },
  {
    path: 'administracion/horarios',
    loadChildren: () => import('./schedule-templates/schedule-templates.routes').then(m => m.scheduleTemplatesRoutes),
    data: { crumbGroup: 'Admin', crumbLeaf: 'Horarios de atención' }
  },
  {
    path: 'pacientes/informacion',
    loadChildren: () => import('./patients/patients.routes').then(m => m.patientRoutes),
    data: { crumbGroup: 'Pacientes', crumbLeaf: 'Información' }
  },
  {
    path: 'pacientes/historial-clinico',
    loadChildren: () => import('./patients/historial-clinico.routes').then(m => m.historialClinicoRoutes),
    data: { crumbGroup: 'Pacientes', crumbLeaf: 'Historial clínico' }
  },
  {
    path: 'pacientes/recetas',
    loadChildren: () => import('./patients/recetas.routes').then(m => m.recetasRoutes),
    data: { crumbGroup: 'Pacientes', crumbLeaf: 'Recetas' }
  },
  {
    path: 'precios/citas',
    loadChildren: () => import('./precios-citas/precios-citas.routes').then(m => m.preciosCitasRoutes),
    data: { crumbGroup: 'Precios', crumbLeaf: 'Citas' }
  },
  {
    path: 'precios/descuentos',
    loadChildren: () => import('./precios-descuentos/precios-descuentos.routes').then(m => m.preciosDescuentosRoutes),
    data: { crumbGroup: 'Precios', crumbLeaf: 'Descuentos' }
  },
  {
    path: 'precios/paquetes',
    loadChildren: () => import('./precios-paquetes/precios-paquetes.routes').then(m => m.preciosPaquetesRoutes),
    data: { crumbGroup: 'Precios', crumbLeaf: 'Paquetes' }
  },
  {
    path: 'precios/sesiones',
    loadChildren: () => import('./precios-sesiones/precios-sesiones.routes').then(m => m.preciosSesionesRoutes),
    data: { crumbGroup: 'Precios', crumbLeaf: 'Sesiones' }
  },
  {
    path: 'precios/promociones',
    loadChildren: () => import('./precios-promociones/precios-promociones.routes').then(m => m.preciosPromocionesRoutes),
    data: { crumbGroup: 'Precios', crumbLeaf: 'Promociones' }
  },
  {
    path: 'finanzas/facturacion',
    loadChildren: () => import('./finanzas/facturacion.routes').then(m => m.facturacionRoutes),
    data: { crumbGroup: 'Finanzas', crumbLeaf: 'Facturación' }
  },
  {
    path: 'finanzas/contabilidad',
    loadChildren: () => import('./finanzas/contabilidad.routes').then(m => m.contabilidadRoutes),
    data: { crumbGroup: 'Finanzas', crumbLeaf: 'Contabilidad' }
  },
  {
    path: 'finanzas/reclamos',
    loadChildren: () => import('./finanzas/reclamos.routes').then(m => m.reclamosRoutes),
    data: { crumbGroup: 'Finanzas', crumbLeaf: 'Reclamos' }
  },
  {
    path: 'turnos',
    loadChildren: () => import('./turns/turns.routes').then(m => m.turnRoutes),
    data: { crumbGroup: 'Turnos', crumbLeaf: 'Gestión de turnos' }
  },
  {
    path: 'calendario',
    loadChildren: () => import('./calendario/calendario.routes').then(m => m.calendarioRoutes),
    data: { crumbGroup: 'Calendario', crumbLeaf: 'Calendario de horarios' }
  },
  {
    path: 'mis-asignaciones',
    loadChildren: () => import('./mis-asignaciones/mis-asignaciones.routes').then(m => m.misAsignacionesRoutes),
    data: { crumbGroup: 'Mis Asignaciones', crumbLeaf: 'Mis Servicios' }
  },
  {
    path: 'bloqueo-de-citas/motivos',
    loadChildren: () => import('./block-reasons/block-reasons.routes').then(m => m.blockReasonRoutes),
    data: { crumbGroup: 'Bloqueo de citas', crumbLeaf: 'Motivos' }
  },
  {
    path: 'bloqueo-de-citas/feriados',
    loadChildren: () => import('./holidays/holidays.routes').then(m => m.holidayRoutes),
    data: { crumbGroup: 'Bloqueo de citas', crumbLeaf: 'Días feriados' }
  },
  {
    path: 'bloqueo-de-citas/vacaciones',
    loadChildren: () => import('./time-offs/time-offs.routes').then(m => m.vacacionesRoutes),
    data: { crumbGroup: 'Bloqueo de citas', crumbLeaf: 'Vacaciones' }
  },
  {
    path: 'bloqueo-de-citas/permisos',
    loadChildren: () => import('./time-offs/time-offs.routes').then(m => m.permisosRoutes),
    data: { crumbGroup: 'Bloqueo de citas', crumbLeaf: 'Permisos' }
  },

  ...ADMIN_NAV.flatMap((entry) => {
    if (entry.children.length === 0) {
      if (entry.path === 'turnos' || entry.path === 'calendario' || entry.path === 'modulos' || entry.path === 'personalizacion') {
        return [];
      }
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
             fullPath !== 'administracion/planes-de-cobertura' &&
             fullPath !== 'administracion/horarios' &&
             fullPath !== 'pacientes/informacion' &&
             fullPath !== 'pacientes/historial-clinico' &&
             fullPath !== 'pacientes/recetas' &&
             fullPath !== 'precios/citas' &&
             fullPath !== 'precios/descuentos' &&
             fullPath !== 'precios/paquetes' &&
             fullPath !== 'precios/sesiones' &&
             fullPath !== 'precios/promociones' &&
             fullPath !== 'dashboard/resumen' &&
             fullPath !== 'dashboard/analytics' &&
             fullPath !== 'metricas/establecimientos' &&
             fullPath !== 'metricas/empleados' &&
             fullPath !== 'metricas/pacientes' &&
             fullPath !== 'reportes/general' &&
             fullPath !== 'reportes/auditoria-hc' &&
             fullPath !== 'bloqueo-de-citas/motivos' &&
             fullPath !== 'bloqueo-de-citas/feriados' &&
             fullPath !== 'bloqueo-de-citas/vacaciones' &&
             fullPath !== 'bloqueo-de-citas/permisos' &&
             fullPath !== 'finanzas/facturacion' &&
             fullPath !== 'finanzas/contabilidad' &&
             fullPath !== 'mis-asignaciones/servicios' &&
             fullPath !== 'finanzas/reclamos';
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
