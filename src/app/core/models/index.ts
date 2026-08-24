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
export * from './page.model';
export * from './establishment.model';
export * from './operator.model';
export * from './doctor.model';
export * from './servicio.model';

// Panel administrativo. Estas ocho no son contrato de la landing ni de la
// pantalla de sala: son las tablas reales del backend QMS.
export * from './patient.model';
export * from './schedule.model';
export * from './turn.model';
export * from './speciality.model';
export * from './holiday.model';
export * from './block-reason.model';
export * from './time-off.model';
export * from './metrics.model';
