import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // La pantalla de sala TIENE que ir antes del `**`, y en `Client`.
  //
  // Dos razones, y las dos son bloqueantes. La primera es mecanica: `sala/:sedeId`
  // tiene un parametro dinamico, y `RenderMode.Prerender` exige un
  // `getPrerenderParams` que enumere los valores posibles. No lo tenemos —
  // las sedes las decide el backend — asi que bajo el `**` heredado el BUILD
  // FALLA, no es que ande mal.
  //
  // La segunda es de fondo: prerenderizar un kiosco no aporta nada. El HTML
  // que sirviera el servidor caducaria en cinco segundos, que es cada cuanto
  // la pantalla vuelve a preguntar. Lo unico que importa aca es el polling, y
  // eso solo corre en el cliente.
  {
    path: 'sala/:sedeId',
    renderMode: RenderMode.Client,
  },
  // El panel tambien en cliente. Aca no es que el prerender falle: andaria y
  // produciria 31 HTML inutiles. Es una app autenticada de datos vivos, el
  // primer render se descarta igual, y prerenderizarla solo alarga el build.
  {
    path: 'admin/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
