export interface Patient {
  uuid: string;
  email: string;
  firstName: string;
  lastName: string;
  ci: string;
  birthday?: string;
  gender?: string;
  address?: string;
  phone?: string;
  emergencyContactPhone?: string;
  emergencyContactName?: string;
}
