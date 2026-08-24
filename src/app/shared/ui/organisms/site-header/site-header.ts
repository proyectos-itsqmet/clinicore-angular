import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Site } from '../../../../core/models';
import { Button } from '../../atoms/button/button';
import { Icon } from '../../atoms/icon/icon';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { AuthService } from '../../../../core/auth/auth.service';

/**
 * app-site-header — the floating glass nav over the hero photograph
 * (design/Main.dc.html section 1 / Mobile.dc.html "NAV"). `position:
 * absolute`, so it never occupies layout space of its own; it sits on
 * top of whatever section renders first (always `app-hero-section`).
 */
@Component({
  selector: 'app-site-header',
  imports: [Button, Icon, Skeleton, RouterLink],
  templateUrl: './site-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'on-dark absolute inset-x-0 top-0 z-[60] py-3 px-4 md:px-0 md:py-[18px]' },
})
export class SiteHeader implements OnInit {
  protected readonly authService = inject(AuthService);

  readonly site = input.required<Site>();
  readonly loading = input(false);

  protected readonly isMenuOpen = signal(false);

  /** Placeholder count for the desktop nav-link skeleton row. */
  protected readonly navSkeletonItems = [0, 1, 2, 3] as const;

  // Redirige dinámicamente a /agendar si el usuario está autenticado, o a /registro si es nuevo
  protected readonly bookingHref = computed(() => {
    return this.authService.isAuthenticated() ? '/agendar' : '/registro';
  });

  ngOnInit(): void {
    this.authService.checkSession().subscribe();
  }

  protected toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }
}
