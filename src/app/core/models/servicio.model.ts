export interface Servicio {
  id: number;
  name: string;
  price: number;
  discount?: number;
}

export interface ServicioCreate {
  name: string;
  price: number;
  discount?: number;
}
