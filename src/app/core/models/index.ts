export * from './shared.model';
export * from './site.model';
export * from './hero.model';
export * from './quick-access.model';
export * from './stats.model';
export * from './insurers.model';
export * from './specialties.model';
export * from './booking-availability.model';
export * from './how-it-works.model';
export * from './doctors.model';
export * from './medical-record.model';
export * from './locations.model';
export * from './reviews.model';
export * from './faq.model';
export * from './public-insurance.model';
export * from './coverage.model';

// No pertenece al contrato de la landing: es la pantalla de sala de espera
// (`GET /api/sala/{sedeId}/pantalla`), otra superficie y otro endpoint.
export * from './waiting-room.model';
