import { ADMIN_DEFAULT_PATH, ADMIN_NAV } from './admin-nav.data';
import { adminRoutes } from './admin.routes';

/**
 * These lock the GENERATION, not the table.
 *
 * The whole point of building the routes from `ADMIN_NAV` is that a menu item
 * and its page can never drift apart — and the failure mode when they do is
 * silent: a menu entry that 404s, or a page nothing links to. A test that
 * re-listed all 31 paths by hand would just be the second copy this design
 * exists to avoid; these assert the RELATIONSHIP between the array and the
 * table instead.
 */
describe('adminRoutes', () => {
  const destinations = adminRoutes.filter((route) => 'loadComponent' in route);
  const redirects = adminRoutes.filter((route) => 'redirectTo' in route);

  /** Every destination `ADMIN_NAV` declares, as the route path it should own. */
  const expectedPaths = ADMIN_NAV.flatMap((entry) =>
    entry.children.length === 0
      ? [entry.path]
      : entry.children.map((child) => `${entry.path}/${child.path}`),
  );

  it('generates exactly one route per destination in the tree', () => {
    expect(destinations.map((route) => route.path).sort()).toEqual([...expectedPaths].sort());
  });

  it('covers the 31 destinations of the specified menu', () => {
    expect(expectedPaths.length).toBe(31);
  });

  it('never generates the same path twice', () => {
    const paths = adminRoutes.map((route) => route.path);

    expect(new Set(paths).size).toBe(paths.length);
  });

  /**
   * A group is a container, not a page. Landing on one bare has to go
   * somewhere real instead of rendering an empty frame.
   */
  it('redirects every group to its first child', () => {
    const groups = ADMIN_NAV.filter((entry) => entry.children.length > 0);

    for (const group of groups) {
      const redirect = redirects.find((route) => route.path === group.path);

      expect(redirect, `falta el redirect de ${group.path}`).toBeTruthy();
      expect(redirect?.redirectTo).toBe(`${group.path}/${group.children[0].path}`);
    }
  });

  it('sends `/admin` and anything unknown to the default page', () => {
    expect(adminRoutes[0]).toEqual({ path: '', pathMatch: 'full', redirectTo: ADMIN_DEFAULT_PATH });
    expect(adminRoutes.at(-1)).toEqual({ path: '**', redirectTo: ADMIN_DEFAULT_PATH });
  });

  /**
   * The breadcrumb, the page title and the browser tab all read from this, so
   * a destination without it renders a header saying "Panel · Panel".
   */
  it('carries the breadcrumb of every destination in its route data', () => {
    for (const route of destinations) {
      expect(route.data?.['crumbGroup'], `${route.path}: falta crumbGroup`).toBeTruthy();
      expect(route.data?.['crumbLeaf'], `${route.path}: falta crumbLeaf`).toBeTruthy();
      expect(route.title, `${route.path}: falta title`).toBeTruthy();
    }
  });

  /** `/admin/admin/usuarios` is a URL nobody should have to read. */
  it('uses `administracion` for the group labelled Admin', () => {
    const entry = ADMIN_NAV.find((item) => item.label === 'Admin');

    expect(entry?.path).toBe('administracion');
  });
});
