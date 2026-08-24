import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';

import { Icon, type IconName } from '../../atoms/icon/icon';

/** One destination inside a group. `path` is relative to its group. */
export interface AdminNavLeaf {
  readonly path: string;
  readonly label: string;
}

/**
 * One first-level row.
 *
 * A row is EITHER a group or a direct link, and `children` is what decides:
 * empty means one click straight to `path`, non-empty means it expands. There
 * is no third kind — a group whose only child repeats its own name was
 * flattened into a link on purpose (`design/panel-admin/`), because two clicks
 * to reach one page is a tax with no return.
 */
export interface AdminNavEntry {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  /** Route segment for this row, relative to `basePath`. */
  readonly path: string;
  readonly children: readonly AdminNavLeaf[];
}

/**
 * app-admin-nav — the admin panel's accordion navigation, in both the desktop
 * sidebar and the mobile drawer. Same component, same behaviour; only the
 * container differs.
 *
 * ACCORDION, one group open at a time. Not a preference — with twelve groups,
 * letting them all open at once is 1638px of nav against 809px with the
 * longest one open. The real cost of the tall version is not the scrollbar: it
 * is that the user stops seeing that the other groups exist.
 *
 * THE TREE IS AN INPUT, not a template. Thirty-three destinations written out by
 * hand in HTML is where inconsistencies accumulate — and it keeps this molecule
 * presentational, per the layer rules: it never imports from `features/`, the
 * feature hands it the data.
 *
 * THE OPEN GROUP DERIVES FROM THE URL, via `linkedSignal`. That is the whole
 * trick and it is worth understanding before changing it: `linkedSignal` is
 * writable — so `toggle()` opens and closes freely — but it RESETS to its
 * source whenever the source changes. So navigating snaps the accordion to the
 * group that holds the active route, while clicking around inside one group
 * leaves the user's choice alone. Keep the open group in a plain `signal()`
 * instead and a deep link or a page reload lands you with the nav closed over
 * the page you are looking at.
 *
 * A11Y. Groups get `aria-expanded` + `aria-controls` pointing at the real
 * panel id; destinations get `aria-current="page"` from `RouterLinkActive`'s own
 * `ariaCurrentWhenActive`, which is what actually announces "you are here".
 * This project already learned the cost of a half-declared pattern —
 * `app-segmented` shipped `role="tab"` with no `aria-controls` and no panel,
 * and its own doc says half a pattern is worse than none. Either wire it whole
 * or ship plain buttons and links.
 *
 * `navigated` fires on every destination click so the mobile drawer can close
 * itself. Desktop ignores it.
 */
@Component({
  selector: 'app-admin-nav',
  imports: [Icon, RouterLink, RouterLinkActive],
  templateUrl: './admin-nav.html',
  styleUrl: './admin-nav.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class AdminNav {
  readonly entries = input.required<readonly AdminNavEntry[]>();
  /** Route prefix every link is built from. */
  readonly basePath = input('/admin');
  /** Fires when a destination is picked — the mobile drawer closes on it. */
  readonly navigated = output<void>();

  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    // The initial value matters as much as the stream: on a deep link the
    // first NavigationEnd may already have fired before this subscribes.
    { initialValue: this.router.url },
  );

  /** The group holding the active route, or `null` when a direct link is active. */
  private readonly routeGroupId = computed(() => {
    const url = this.url();
    const base = this.basePath();
    return (
      this.entries().find((entry) => entry.children.length > 0 && url.startsWith(`${base}/${entry.path}`))
        ?.id ?? null
    );
  });

  protected readonly openId = linkedSignal(() => this.routeGroupId());

  protected readonly rows = computed(() => {
    const base = this.basePath();
    const openId = this.openId();

    return this.entries().map((entry) => ({
      id: entry.id,
      label: entry.label,
      icon: entry.icon,
      isGroup: entry.children.length > 0,
      isOpen: openId === entry.id,
      link: `${base}/${entry.path}`,
      /** Target of the group button's `aria-controls`. */
      panelId: `admin-nav-panel-${entry.id}`,
      children: entry.children.map((child) => ({
        path: child.path,
        label: child.label,
        link: `${base}/${entry.path}/${child.path}`,
      })),
    }));
  });

  protected toggle(id: string): void {
    this.openId.set(this.openId() === id ? null : id);
  }
}
