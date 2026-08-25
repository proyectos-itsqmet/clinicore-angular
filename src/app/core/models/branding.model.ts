/**
 * `personalizacion` — clinic-wide identity (`GET`/`PUT /api/branding`).
 *
 * SINGLETON: there is exactly one row on the backend (see `BrandingService`'s
 * own docblock in Backend_QMS: find-the-one-row-if-any, then update it, never
 * a second insert). `GET` is public and returns a NEAR-EMPTY body when
 * nothing has been configured yet — `BrandingDTO` is annotated
 * `@JsonInclude(NON_NULL)`, so every unset field (including `name`) is
 * OMITTED from the response rather than sent as `null`. Every field here is
 * optional to mirror that wire shape honestly instead of lying about what a
 * fresh install actually returns.
 */
export interface Branding {
  id?: number;
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  phone?: string;
  emergencyPhone?: string;
  whatsapp?: string;
  email?: string;
  updatedAt?: string;
}

/**
 * `PUT /api/branding` body. `name` is the only required field
 * (`@NotBlank` on `BrandingDTO`) — `primaryColor`/`secondaryColor`, when
 * present, must match `^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$` server-side.
 * `id`/`updatedAt` are deliberately absent: `BrandingService#save` never
 * reads them off the incoming body (the client must never be able to pick
 * which row gets updated), so there is no point sending them.
 */
export interface BrandingUpdate {
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  phone?: string;
  emergencyPhone?: string;
  whatsapp?: string;
  email?: string;
}
