export const environment = {
  production: false,
  get apiUrl(): string {
    if (
      typeof window !== 'undefined' &&
      (window as any).__env &&
      typeof (window as any).__env.apiUrl === 'string'
    ) {
      return (window as any).__env.apiUrl;
    }
    return '';
  },
};
