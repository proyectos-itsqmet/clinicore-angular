export interface Operator {
  uuid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface OperatorCreate {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: string;
}
