/**
 * `modulos` — one row per top-level `ADMIN_NAV` destination
 * (`GET /api/admin-modules`, `PUT /api/admin-modules/{moduleKey}`).
 *
 * HONESTY NOTE — mirrors `AdminModule`'s own docblock in Backend_QMS word for
 * word: this is DATA ONLY today. `enabled` is stored and returned; nothing
 * reads it yet — disabling a row here does not hide its menu entry, does not
 * block its Angular route, and does not gate any backend endpoint.
 * `modules-list.component` surfaces this permanently in its own UI; do not
 * treat `enabled` as a working feature flag anywhere else in this app.
 *
 * Fixed catalog (12 seeded rows): there is no `POST`/`DELETE` on the backend
 * controller, so this model has no `*Create` counterpart.
 */
export interface AdminModule {
  id: number;
  moduleKey: string;
  label: string;
  enabled: boolean;
}
