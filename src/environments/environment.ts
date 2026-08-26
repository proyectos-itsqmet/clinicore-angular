// Este archivo usa un patrón de carga de configuración en tiempo de ejecución (runtime).
// En vez de inyectar variables en tiempo de construcción (build-time), lee desde `window.__env`
// que es poblado por `assets/env.js`. Esto permite usar la misma imagen Docker
// en diferentes entornos.

export const environment = {
  production: false,
  get apiUrl() {
    if (typeof window !== 'undefined' && (window as any).__env && (window as any).__env.apiUrl) {
      return (window as any).__env.apiUrl;
    }
    // Fallback para SSR o si no existe el archivo env.js
    if (typeof process !== 'undefined' && process.env && process.env['BACKEND_URL']) {
      return process.env['BACKEND_URL'];
    }
    return 'http://localhost:8080';
  }
};
