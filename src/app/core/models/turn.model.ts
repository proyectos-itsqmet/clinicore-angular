import type { Patient } from './patient.model';
import type { Operator } from './operator.model';
import type { ScheduleDTO } from './schedule.model';

export type TurnStatus = 
  | 'TURN_PENDING' 
  | 'TURN_WAITNG' 
  | 'TURN_IN_TREATMENT' 
  | 'TURN_TREATED' 
  | 'TURN_CANCELLED';

export interface Turn {
  id: number;
  order: number;
  status: TurnStatus;
  createdAt: string;
  finishedAt?: string;
  cancelledAt?: string;
  operator?: Operator;
  patient?: Patient;
  schedule?: ScheduleDTO;
}

export interface TurnFilterParams {
  status?: TurnStatus | string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  sort?: string;
}
