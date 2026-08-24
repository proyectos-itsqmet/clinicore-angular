export * from './landing-data-base-url';
export * from './landing-api';
export * from './sala-screen-url';
export * from './sala-api';

// Panel administrativo. Todos construyen su URL desde `API_BASE_URL` y mandan
// `withCredentials: true`, porque la sesion es una cookie del backend.
//
// Antes esta barrica solo exportaba landing y sala mientras los cuatro
// servicios del panel vivian sin exportar: existian, pero el que los buscaba
// aca no los encontraba.
export * from './api-base-url';
export * from './establishment-api.service';
export * from './doctor-api.service';
export * from './operator-api.service';
export * from './servicio-api.service';
export * from './patient-api.service';
export * from './schedule-api.service';
export * from './turn-api.service';
export * from './speciality-api.service';
export * from './holiday-api.service';
export * from './block-reason-api.service';
export * from './time-off-api.service';
export * from './metrics-api.service';
