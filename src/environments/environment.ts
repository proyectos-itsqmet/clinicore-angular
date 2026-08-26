// Configuración de entorno con soporte para runtime dinámico (Docker) y SSR.
//
// En el NAVEGADOR: `window.__env.apiUrl` es inyectado por `public/env.js`
// (en dev) o por el entrypoint de Docker (en producción).
//
// En SSR (Node): `window` no existe, así que devolvemos '' (cadena vacía).
// Esto hace que las peticiones salgan como rutas relativas (/api/..., /auth/...),
// que es exactamente lo que el interceptor necesita ya que en SSR no hay
// backend disponible y las peticiones se omiten via TransferState.

export const environment = {
  production: false,
  get apiUrl(): string {
    if (typeof window !== 'undefined' && (window as any).__env && typeof (window as any).__env.apiUrl === 'string') {
      return (window as any).__env.apiUrl;
    }
    return '';
  }
};
