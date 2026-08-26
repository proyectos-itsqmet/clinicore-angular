import localeEsEc from '@angular/common/locales/es-EC';
import { registerLocaleData } from '@angular/common';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { apiInterceptor } from './core/interceptors/api.interceptor';

// Several organisms format money/numbers through `CurrencyPipe`/`DecimalPipe`
// at the `es-EC` locale (see e.g. `app-price-row`, `app-closing-cta`,
// `app-reviews-section`'s own doc comments) — Angular only ships English
// locale data by default, so those pipes throw `NG0701: Missing locale
// data for the locale "es-EC"` the moment they run on real data unless
// this locale is registered once, here, at app startup.
registerLocaleData(localeEsEc);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'es-EC' },
    // `withComponentInputBinding()` hace que los parametros de ruta lleguen a
    // los `input()` del componente por nombre, en vez de tener que inyectar
    // `ActivatedRoute` y leer el snapshot. Lo usa `app-waiting-room-display`
    // para su `:sedeId`. Es aditivo: la landing no declara inputs, asi que
    // nada de lo que ya existe cambia de comportamiento.
    provideRouter(routes, withComponentInputBinding()),
    // `provideClientHydration()` enables the HTTP transfer cache by default:
    // any `httpResource`/`HttpClient` GET made during the server render is
    // captured and replayed on the client, so hydration does not re-fetch.
    provideClientHydration(),
    // `withFetch()` is requested explicitly even though `FetchBackend` is
    // already the default backend, to keep the intent visible in config.
    provideHttpClient(withFetch(), withInterceptors([apiInterceptor])),
  ]
};
