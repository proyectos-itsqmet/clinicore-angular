import type { Servicio } from './servicio.model';

/**
 * A line item inside a `ServicePackage` bundle: one `Servicio` plus how many
 * units of it the bundle includes. Mirrors `PackageItemDTO` (Backend_QMS).
 */
export interface PackageItem {
  id: number;
  servicio: Servicio;
  quantity: number;
}

export interface PackageItemCreate {
  servicio: { id: number };
  quantity: number;
}

/**
 * A bundle of services sold at one combined price. Mirrors `ServicePackageDTO`
 * (Backend_QMS). Named `ServicePackage` (not `Package`) to mirror the backend
 * entity name, which itself avoids shadowing `java.lang.Package`.
 *
 * `price` is set explicitly by the admin and is NEVER the sum of `items` —
 * `itemsTotal`/`savings` are read-only fields computed by the backend purely
 * for display/comparison (see `ServicePackageService#computeItemsTotal`).
 * Neither value should ever be used to silently overwrite the other.
 */
export interface ServicePackage {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  items: PackageItem[];
  /** Read-only. Sum of each item's `Servicio` net price (price - discount) times its quantity. */
  itemsTotal: number;
  /** Read-only. `itemsTotal - price`. Can be negative — surfaced as-is, never clamped. */
  savings: number;
  createdAt?: string;
}

export interface ServicePackageCreate {
  name: string;
  description?: string | null;
  price: number;
  items: PackageItemCreate[];
}
