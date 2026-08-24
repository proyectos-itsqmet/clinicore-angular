import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing-page').then((module) => module.LandingPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login-page').then((module) => module.LoginPage),
    title: 'Ingreso · CliniCore',
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/auth/register-page').then((module) => module.RegisterPage),
    title: 'Registro de Paciente · CliniCore',
  },
  {
    path: 'agendar',
    loadComponent: () => import('./features/booking/booking-page').then((module) => module.BookingPage),
    title: 'Agendar Turno · CliniCore',
  },
  {
    path: 'citas/agendar',
    redirectTo: 'agendar',
    pathMatch: 'full'
  },
  {
    path: 'perfil',
    loadComponent: () => import('./features/patient/patient-profile').then((module) => module.PatientProfileComponent),
    title: 'Mi Perfil y Turnos · CliniCore',
  },
  {
    path: 'mi-perfil',
    redirectTo: 'perfil',
    pathMatch: 'full'
  },
  // La pantalla de sala de espera. Sin chrome, sin scroll, relacion de aspecto
  // fija: es un TV, no una pagina. `:sedeId` llega al componente como `input`
  // gracias a `withComponentInputBinding()` en app.config.ts, y de ahi a
  // `SalaApi.sedeId`, que es lo que construye la URL del endpoint.
  //
  // Se renderiza en CLIENTE, no prerenderizada — ver app.routes.server.ts.
  {
    path: 'sala/:sedeId',
    loadComponent: () =>
      import('./features/waiting-room/waiting-room-display').then((module) => module.WaitingRoomDisplay),
  },
  // El panel administrativo. RUTA DE LAYOUT, no una lista de hermanas: el
  // componente trae el sidebar, la barra y el outlet, y las 31 secciones son
  // sus HIJAS. Aplanarlo haria que el acordeon, el scroll y el drawer se
  // reseteen en cada clic.
  //
  // `loadChildren` con la tabla GENERADA de ADMIN_NAV — ver admin.routes.ts.
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./features/admin/admin-layout').then((module) => module.AdminLayout),
    loadChildren: () => import('./features/admin/admin.routes').then((module) => module.adminRoutes),
  },
];
