export interface Establishment {
  id: number;
  name: string;
  address: string;
  operators?: any;
  doctors?: any;
  services?: any[];
}

export interface EstablishmentCreate {
  name: string;
  address: string;
}
