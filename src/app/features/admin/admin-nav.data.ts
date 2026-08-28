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
    allowedRoles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'],
    children: [
      { path: 'resumen', label: 'Resumen general', allowedRoles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
      { path: 'analytics', label: 'Analytics', allowedRoles: ['ROLE_ADMIN'] },
    ],
  },
  // Solo ROLE_DOCTOR. "Mis Servicios" son los servicios asignados a QUIEN esta
  // mirando, asi que para un administrador la pantalla no tiene contenido
  // propio: no es que vea de mas, es que ve una lista vacia de algo que no le
  // corresponde. Lo que un admin necesita — quien atiende que — vive en
  // Administracion > Doctores.
  //
  // Quitar ROLE_ADMIN de aca lo saca del menu Y bloquea la ruta: `roleGuard`
  // lee estos mismos `allowedRoles` desde ADMIN_NAV, con el hijo pisando al
  // padre. Un solo lugar para las dos cosas.
  {
    id: 'mis-asignaciones',
    label: 'Mis Asignaciones',
    icon: 'calendar',
    path: 'mis-asignaciones',
    allowedRoles: ['ROLE_DOCTOR'],
    children: [
      { path: 'servicios', label: 'Mis Servicios', allowedRoles: ['ROLE_DOCTOR'] },
      { path: 'turnos', label: 'Mis Turnos', allowedRoles: ['ROLE_DOCTOR'] },
    ],
  },
  {
    id: 'metricas',
    label: 'Métricas',
    icon: 'chart',
    path: 'metricas',
    allowedRoles: ['ROLE_ADMIN'],
    children: [
      { path: 'establecimientos', label: 'Establecimientos', allowedRoles: ['ROLE_ADMIN'] },
      { path: 'empleados', label: 'Empleados', allowedRoles: ['ROLE_ADMIN'] },
      { path: 'pacientes', label: 'Pacientes', allowedRoles: ['ROLE_ADMIN'] },
    ],
  },
  // OCULTOS para la presentacion, con `hidden` y no borrando la entrada: las
  // rutas del panel se GENERAN desde ADMIN_NAV, asi que borrar la fila
  // tambien borraria la ruta y el modulo entero. Con el flag, el codigo sigue
  // ahi y volver a mostrarlo es quitar una palabra.
  //
  // `personalizacion` ademas no funciona todavia: deberia cambiar el tema y el
  // logo de la app y no lo hace, asi que mostrarla es ofrecer un control que
  // no responde.
  { id: 'modulos', label: 'Módulos', icon: 'box', path: 'modulos', allowedRoles: ['ROLE_ADMIN'], hidden: true, children: [] },
  { id: 'personalizacion', label: 'Personalización', icon: 'droplet', path: 'personalizacion', allowedRoles: ['ROLE_ADMIN'], hidden: true, children: [] },
  {
    id: 'administracion',
    label: 'Admin',
    icon: 'shield',
    path: 'administracion',
    allowedRoles: ['ROLE_ADMIN'],
    children: [
      { path: 'establecimientos', label: 'Gestor de establecimientos', allowedRoles: ['ROLE_ADMIN'] },
      { path: 'operadores', label: 'Operadores', allowedRoles: ['ROLE_ADMIN'] },
      { path: 'doctores', label: 'Doctores', allowedRoles: ['ROLE_ADMIN'] },
      { path: 'especialidades', label: 'Servicios', allowedRoles: ['ROLE_ADMIN'] },
      { path: 'planes-de-cobertura', label: 'Planes de cobertura', allowedRoles: ['ROLE_ADMIN'] },
      { path: 'horarios', label: 'Horarios de atención', allowedRoles: ['ROLE_ADMIN'] },
    ],
  },
  {
    id: 'precios',
    label: 'Precios',
    icon: 'tag',
    path: 'precios',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE', 'ROLE_DOCTOR'],
    children: [
      { path: 'citas', label: 'Citas', allowedRoles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
      { path: 'paquetes', label: 'Paquetes', allowedRoles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE', 'ROLE_DOCTOR'] },
      { path: 'sesiones', label: 'Sesiones', allowedRoles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE', 'ROLE_DOCTOR'] },
      { path: 'descuentos', label: 'Descuentos', allowedRoles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE', 'ROLE_DOCTOR'] },
      { path: 'promociones', label: 'Promociones', allowedRoles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE', 'ROLE_DOCTOR'] },
    ],
  },
  {
    id: 'bloqueo',
    label: 'Bloqueo de citas',
    icon: 'ban',
    path: 'bloqueo-de-citas',
    allowedRoles: ['ROLE_ADMIN'],
    children: [
      { path: 'feriados', label: 'Días feriados', allowedRoles: ['ROLE_ADMIN'] },
      { path: 'vacaciones', label: 'Vacaciones', allowedRoles: ['ROLE_ADMIN'] },
      { path: 'permisos', label: 'Permisos', allowedRoles: ['ROLE_ADMIN'] },
      { path: 'motivos', label: 'Motivos', allowedRoles: ['ROLE_ADMIN'] },
    ],
  },
  { id: 'turnos', label: 'Turnos', icon: 'clock', path: 'turnos', allowedRoles: ['ROLE_EMPLOYEE', 'ROLE_ADMIN'], children: [] },

  // Justo debajo de Turnos, y no en Administración, porque no se configura
  // nada acá: se abre la pantalla de una sala. Es una acción operativa del
  // mismo turno de trabajo, y quien la necesita ya está mirando esta zona.
  //
  // Existe porque la URL de sala lleva el id numérico de la sede
  // (`/sala/11`) y ese id no se ve en ninguna pantalla. Adivinarlo mal no da
  // error: da un televisor que parece congelado mostrando otra sede.
  { id: 'pantalla-turnos', label: 'Pantalla turnos', icon: 'play', path: 'pantalla-turnos', allowedRoles: ['ROLE_EMPLOYEE', 'ROLE_ADMIN'], children: [] },
  { id: 'calendario', label: 'Calendario', icon: 'calendar', path: 'calendario', allowedRoles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'], children: [] },
  {
    id: 'pacientes',
    label: 'Pacientes',
    icon: 'user',
    path: 'pacientes',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_DOCTOR', 'ROLE_EMPLOYEE'],
    children: [
      { path: 'informacion', label: 'Información', allowedRoles: ['ROLE_ADMIN', 'ROLE_DOCTOR', 'ROLE_EMPLOYEE'] },
      { path: 'historial-clinico', label: 'Historial clínico', allowedRoles: ['ROLE_ADMIN', 'ROLE_DOCTOR', 'ROLE_EMPLOYEE'] },
      { path: 'recetas', label: 'Recetas', allowedRoles: ['ROLE_ADMIN', 'ROLE_DOCTOR', 'ROLE_EMPLOYEE'] },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    icon: 'banknote',
    path: 'finanzas',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_DOCTOR', 'ROLE_EMPLOYEE'],
    children: [
      { path: 'facturacion', label: 'Facturación', allowedRoles: ['ROLE_ADMIN', 'ROLE_DOCTOR', 'ROLE_EMPLOYEE'] },
      { path: 'contabilidad', label: 'Contabilidad', allowedRoles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
      { path: 'reclamos', label: 'Reclamos', allowedRoles: ['ROLE_ADMIN', 'ROLE_EMPLOYEE'] },
    ],
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: 'document',
    path: 'reportes',
    allowedRoles: ['ROLE_EMPLOYEE', 'ROLE_ADMIN'],
    children: [
      { path: 'auditoria-hc', label: 'Auditoría HC', allowedRoles: ['ROLE_EMPLOYEE', 'ROLE_ADMIN'] },
      { path: 'general', label: 'General', allowedRoles: ['ROLE_EMPLOYEE', 'ROLE_ADMIN'] },
    ],
  },
]

/** Where `/admin` lands. The panel's home is the general summary. */
export const ADMIN_DEFAULT_PATH = 'dashboard/resumen';
