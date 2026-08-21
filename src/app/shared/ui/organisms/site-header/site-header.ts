import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import type { Site } from '../../../../core/models';
import { Button } from '../../atoms/button/button';
import { Icon } from '../../atoms/icon/icon';
import { Skeleton } from '../../atoms/skeleton/skeleton';

/**
 * app-site-header — the floating glass nav over the hero photograph
 * (design/Main.dc.html section 1 / Mobile.dc.html "NAV"). `position:
 * absolute`, so it never occupies layout space of its own; it sits on
 * top of whatever section renders first (always `app-hero-section`).
 *
 * ---------------------------------------------------------------
 * LOAD-BEARING MEASUREMENT — read this before touching hero padding.
 * ---------------------------------------------------------------
 * The desktop nav bar is exactly 76px tall: the primary CTA's 52px
 * `min-height` (see `app-button`'s `md` size) plus 12px of vertical
 * padding on each side of the glass pill wrapper (`py-3` = 12px × 2).
 * The header itself sits at `top: 0` with `padding: 18px 0`, so the
 * pill's own bottom edge lands at `18 + 76 = 94px` from the viewport
 * top. `app-hero-section` reserves 156px of top padding specifically
 * so its own content (kicker/h1) never starts underneath that 94px
 * line — it is not an arbitrary number. If this header's vertical
 * padding, the CTA's `md` size, or the glass wrapper's `py-3` ever
 * change, `app-hero-section`'s `pt-[156px]` must be re-measured too.
 * ---------------------------------------------------------------
 *
 * Mobile collapses to logo + menu button; the dropdown panel is local
 * UI state (a signal), not something a parent needs to know about. The
 * panel is toggled with the `hidden` attribute rather than `@if`, so the
 * `aria-controls="site-header-panel"` target exists from first render —
 * see the template comment before changing that back.
 */
@Component({
  selector: 'app-site-header',
  imports: [Button, Icon, Skeleton],
  templateUrl: './site-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'on-dark absolute inset-x-0 top-0 z-[60] py-3 px-4 md:px-0 md:py-[18px]' },
})
export class SiteHeader {
  readonly site = input.required<Site>();
  readonly loading = input(false);

  protected readonly isMenuOpen = signal(false);

  /** Placeholder count for the desktop nav-link skeleton row. */
  protected readonly navSkeletonItems = [0, 1, 2, 3] as const;

  protected toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }
}
