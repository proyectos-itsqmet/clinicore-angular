import type { Servicio } from './servicio.model';

/** Mirrors `com.devluis.types.DiscountType` (Backend_QMS). */
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

/**
 * A time-bounded price reduction on ONE `Servicio` ("20% off teeth whitening
 * in August"). Mirrors `PromotionDTO` (Backend_QMS).
 *
 * This is the ONLY time-bounded discount mechanism in the system —
 * `Servicio.discount` (`precios/descuentos`) is the STANDING, non-expiring
 * reduction; `Promotion` is the CAMPAIGN, expiring one.
 *
 * AT MOST ONE `Promotion` may be active for a given `Servicio` on any given
 * date: the backend REJECTS a create/update whose `[startDate, endDate]`
 * overlaps an existing `Promotion` for the same `servicio` (400, Spanish
 * message, does not itself name the conflicting record — see
 * `promotion-overlap.util.ts`).
 */
export interface Promotion {
  id: number;
  servicio: Servicio;
  name: string;
  discountType: DiscountType;
  /** `PERCENTAGE`: 0-100 (exclusive of 0). `FIXED_AMOUNT`: a currency amount, same unit as `Servicio.price`. */
  discountValue: number;
  /** ISO `YYYY-MM-DD`, inclusive. */
  startDate: string;
  /** ISO `YYYY-MM-DD`, inclusive. */
  endDate: string;
  /** Read-only. Computed by the backend: `true` when today falls within `[startDate, endDate]`. */
  currentlyActive?: boolean;
  createdAt?: string;
}

export interface PromotionCreate {
  servicio: { id: number };
  name: string;
  discountType: DiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
}
