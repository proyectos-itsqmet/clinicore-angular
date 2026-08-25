export interface Servicio {
  id: number;
  name: string;
  price: number;
  discount?: number;
  /**
   * Read-only, computed by the backend as `price - discount`. Use this
   * instead of re-deriving `price - discount` client-side wherever it is
   * present — `precios-citas-list.component.ts` predates this field and
   * still computes its own `finalPrice()`; new code should prefer `netPrice`.
   */
  netPrice?: number;
}

export interface ServicioCreate {
  name: string;
  price: number;
  discount?: number;
}
