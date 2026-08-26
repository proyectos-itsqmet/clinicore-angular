const getApiUrl = () => {
  if (typeof window !== 'undefined' && (window as any).__env && typeof (window as any).__env.apiUrl === 'string') {
    return (window as any).__env.apiUrl;
  }
  if (typeof process !== 'undefined' && process.env && process.env['API_URL']) {
    return process.env['API_URL'];
  }
  return ''; // Usar rutas relativas si no hay configuración
};

export const environment = {
  production: false,
  apiUrl: getApiUrl()
};
