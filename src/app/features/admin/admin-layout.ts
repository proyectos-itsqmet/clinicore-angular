import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { Icon } from '../../shared/ui/atoms/icon/icon';
import { AdminNav } from '../../shared/ui/molecules/admin-nav/admin-nav';
import { ADMIN_NAV } from './admin-nav.data';

/** Breadcrumb pair every generated route carries in its `data`. */
interface Crumb {
  group: string;
  leaf: string;
}

/**
 * app-admin-layout — the admin panel's shell (`design/panel-admin/`): sidebar
 * or drawer, top bar, and the outlet the 32 sections render into.
 *
 * It is a LAYOUT ROUTE, and that is load-bearing: the sections are child
 * routes of this component, so navigating between them never remounts the
 * shell. Flatten it into 32 sibling routes and the accordion, the scroll
 * position and the drawer state all reset on every click.
 *
 * FIXED HEIGHT, NOT A SCROLLING PAGE. The root is `h-dvh overflow-hidden` and
 * only the content region scrolls, which is what makes the sidebar and the top
 * bar stay put. It also means there is no page scroll to lock when the mobile
 * drawer opens — the usual `body { overflow: hidden }` dance is unnecessary
 * here.
 *
 * THE TWO HEADER BARS ARE BOTH 64px at `lg:` (56px below it). They have to
 * match: the sidebar's hairline and the top bar's hairline read as ONE line
 * crossing the screen, and 8px of drift reads as two lines badly joined. If you
 * change one, change the other.
 *
 * BREADCRUMB FROM ROUTE DATA, not from a second copy of the tree.
 * `admin.routes.ts` generates `data.crumbGroup` / `data.crumbLeaf` from the
 * same `ADMIN_NAV` the menu renders, so the bar, the menu and the browser tab
 * cannot disagree.
 *
 * DRAWER A11Y is wired whole, not half — this project already paid for a
 * half-declared pattern once (`app-segmented`, `role="tab"` with no
 * `aria-controls`): `role="dialog"` + `aria-modal`, Escape closes, the scrim is
 * a real labelled button, focus moves to the close button on open and returns
 * to the hamburger on close, and the rest of the shell goes `inert` so Tab
 * cannot walk out the back of the drawer.
 *
 * NOT WIRED YET, on purpose: the sede switcher and the user menu are shell
 * furniture with no behaviour — this step was the shell. The sede switcher in
 * particular is not decoration: it is the context every table in the panel is
 * scoped by, so it needs resolving before the first real number lands.
 *
 * The page-header actions from the board ("Exportar", "Nuevo") deliberately do
 * NOT live here. They are section-specific — "Nuevo" makes no sense on the
 * Dashboard — so they belong to whichever section owns them, and a shared
 * `app-page-header` is the right home for that pattern once real sections
 * exist. Putting them in the shell would put a fake button on 32 pages.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [AdminNav, Icon, RouterOutlet],
  templateUrl: './admin-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'contents',
    '(document:keydown.escape)': 'closeDrawer()',
  },
})
export class AdminLayout {
  /** Tailwind's `lg:`. Kept in sync with the template's breakpoint by hand. */
  private static readonly DESKTOP_QUERY = '(min-width: 64rem)';

  protected readonly nav = ADMIN_NAV;
  protected readonly drawerOpen = signal(false);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  private readonly routeData = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.deepestData()),
    ),
    // The initial value is not optional: on a deep link the first
    // NavigationEnd can fire before this subscribes.
    { initialValue: this.deepestData() },
  );

  protected readonly crumb = computed<Crumb>(() => {
    const data = this.routeData();
    return {
      group: typeof data['crumbGroup'] === 'string' ? data['crumbGroup'] : 'Panel',
      leaf: typeof data['crumbLeaf'] === 'string' ? data['crumbLeaf'] : 'Panel',
    };
  });

  constructor() {
    // Focus into the drawer when it opens, so a keyboard user is not left
    // tabbing through an `inert` shell looking for it.
    effect(() => {
      if (this.drawerOpen()) {
        this.closeButton()?.nativeElement.focus();
      }
    });

    afterNextRender(() => {
      // Without this the panel can LOCK UP: open the drawer at phone width,
      // widen the window past `lg:`, and the drawer goes `lg:hidden` by CSS
      // while `drawerOpen` stays true — leaving the whole shell `inert` with
      // nothing on screen able to clear it.
      const desktop = window.matchMedia(AdminLayout.DESKTOP_QUERY);
      const closeOnDesktop = () => {
        if (desktop.matches) {
          this.drawerOpen.set(false);
        }
      };

      closeOnDesktop();
      desktop.addEventListener('change', closeOnDesktop);
      this.destroyRef.onDestroy(() => desktop.removeEventListener('change', closeOnDesktop));
    });
  }

  protected openDrawer(): void {
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    if (!this.drawerOpen()) {
      return;
    }
    this.drawerOpen.set(false);
    this.menuButton()?.nativeElement.focus();
  }

  /** The deepest activated child's `data` — where the generated crumb lives. */
  private deepestData(): Record<string, unknown> {
    let snapshot = this.route.snapshot;
    while (snapshot.firstChild) {
      snapshot = snapshot.firstChild;
    }
    return snapshot.data;
  }
}
