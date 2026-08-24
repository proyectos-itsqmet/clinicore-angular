import type { Establishment } from './establishment.model';

export interface Operator {
  uuid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  stablishment?: Establishment;
  stablishments?: Establishment[];
}

export interface OperatorCreate {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: string;
}
