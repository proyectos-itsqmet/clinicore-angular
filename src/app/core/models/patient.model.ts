/**
 * Un paciente visto por el panel — `GET /api/patients`.
 *
 * `password` NO esta en la forma de lectura y no es un olvido: el backend lo
 * omite en su mapeo (`PatientService.mapToDTO` no lo setea), asi que declararlo
 * seria prometer un dato que nunca llega.
 *
 * El panel solo LEE pacientes. Editar el contacto es cosa del propio paciente
 * desde la app movil (`PUT /api/patients/me`), y los datos de identidad son de
 * solo lectura incluso para el: la historia clinica esta archivada con ellos.
 */
export interface Patient {
  uuid: string;
  email: string;
  firstName: string;
  lastName: string;
  ci: string;
  /** ISO `YYYY-MM-DD`. */
  birthday?: string;
  gender?: string;
  address?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}
