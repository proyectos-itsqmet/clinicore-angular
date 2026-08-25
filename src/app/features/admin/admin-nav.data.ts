import type { AdminNavEntry } from '../../shared/ui/molecules/admin-nav/admin-nav';

/**
 * The admin panel's whole navigation, and the single source of truth for it:
 * `app-admin-nav` renders from this, and `admin.routes.ts` GENERATES the route
 * table from it. Add an entry here and both the menu and its route exist.
 *
 * That is the point. Thirty-one destinations declared twice — once as menu
 * markup and once as routes — is a guarantee that they will drift, and the
 * failure is silent: a menu item that 404s, or a page nothing links to.
 *
 * The structure is exactly as specified (`design/panel-admin/`), with one
 * shape change that was decided explicitly: three groups whose only child
 * repeated the parent's name (Módulos → Gestionar módulos, Personalización →
 * Estilo, Turnos → Gestión de turnos) are direct links, like Calendario
 * already was. An empty `children` is what makes a row a link.
 *
 * 8 groups + 4 links = 12 first-level rows, 32 destinations.
 *
 * ONE URL DEVIATION: the group labelled "Admin" uses the `administracion`
 * segment, because it lives under `/admin` and `/admin/admin/usuarios` is a
 * URL nobody should have to read. The LABEL is untouched.
 */
export const ADMIN_NAV: readonly AdminNavEntry[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'grid',
    path: 'dashboard',
    children: [
      { path: 'resumen', label: 'Resumen general' },
      { path: 'analytics', label: 'Analytics' },
    ],
  },
  {
    id: 'metricas',
    label: 'Métricas',
    icon: 'chart',
    path: 'metricas',
    children: [
      { path: 'establecimientos', label: 'Establecimientos' },
      { path: 'empleados', label: 'Empleados' },
      { path: 'pacientes', label: 'Pacientes' },
    ],
  },
  { id: 'modulos', label: 'Módulos', icon: 'box', path: 'modulos', children: [] },
  { id: 'personalizacion', label: 'Personalización', icon: 'droplet', path: 'personalizacion', children: [] },
  {
    id: 'administracion',
    label: 'Admin',
    icon: 'shield',
    path: 'administracion',
    children: [
      { path: 'establecimientos', label: 'Gestor de establecimientos' },
      { path: 'operadores', label: 'Operadores' },
      { path: 'doctores', label: 'Doctores' },
      { path: 'especialidades', label: 'Servicios' },
      { path: 'planes-de-cobertura', label: 'Planes de cobertura' },
      { path: 'horarios', label: 'Horarios de atención' },
    ],
  },
  {
    id: 'precios',
    label: 'Precios',
    icon: 'tag',
    path: 'precios',
    children: [
      { path: 'citas', label: 'Citas' },
      { path: 'paquetes', label: 'Paquetes' },
      { path: 'sesiones', label: 'Sesiones' },
      { path: 'descuentos', label: 'Descuentos' },
      { path: 'promociones', label: 'Promociones' },
    ],
  },
  {
    id: 'bloqueo',
    label: 'Bloqueo de citas',
    icon: 'ban',
    path: 'bloqueo-de-citas',
    children: [
      { path: 'feriados', label: 'Días feriados' },
      { path: 'vacaciones', label: 'Vacaciones' },
      { path: 'permisos', label: 'Permisos' },
      { path: 'motivos', label: 'Motivos' },
    ],
  },
  { id: 'turnos', label: 'Turnos', icon: 'clock', path: 'turnos', children: [] },
  { id: 'calendario', label: 'Calendario', icon: 'calendar', path: 'calendario', children: [] },
  {
    id: 'pacientes',
    label: 'Pacientes',
    icon: 'user',
    path: 'pacientes',
    children: [
      { path: 'informacion', label: 'Información' },
      { path: 'historial-clinico', label: 'Historial clínico' },
      { path: 'recetas', label: 'Recetas' },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    icon: 'banknote',
    path: 'finanzas',
    children: [
      { path: 'facturacion', label: 'Facturación' },
      { path: 'contabilidad', label: 'Contabilidad' },
      { path: 'reclamos', label: 'Reclamos' },
    ],
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: 'document',
    path: 'reportes',
    children: [
      { path: 'auditoria-hc', label: 'Auditoría HC' },
      { path: 'general', label: 'General' },
    ],
  },
];

/** Where `/admin` lands. The panel's home is the general summary. */
export const ADMIN_DEFAULT_PATH = 'dashboard/resumen';
