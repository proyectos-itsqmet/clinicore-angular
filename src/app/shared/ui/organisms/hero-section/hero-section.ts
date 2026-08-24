import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { Hero } from '../../../../core/models';
import { Button } from '../../atoms/button/button';
import { Figure } from '../../atoms/figure/figure';
import { Icon } from '../../atoms/icon/icon';
import { Kicker } from '../../atoms/kicker/kicker';
import { LiveDot } from '../../atoms/live-dot/live-dot';
import { Pill } from '../../atoms/pill/pill';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { PhotoFrame } from '../../molecules/photo-frame/photo-frame';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-hero-section',
  imports: [Button, Figure, Icon, Kicker, LiveDot, Pill, Skeleton, PhotoFrame, AssetUrlPipe],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block h-[780px] overflow-hidden bg-navy-deep on-dark md:h-[822px]' },
})
export class HeroSection {
  private readonly authService = inject(AuthService);

  readonly hero = input.required<Hero>();
  readonly loading = input(false);

  protected readonly primaryCtaHref = computed(() => {
    return this.authService.isAuthenticated() ? '/agendar' : '/registro';
  });

  /**
   * Fixed placeholder count matching `jsons/landing/hero.json`'s 4 `trustPills` —
   * four entries, never `hero().trustPills.length`, which is 0 exactly while loading.
   *
   * Each entry is that pill's MEASURED loaded width (181.48 / 203.17 / 156.03 /
   * 114.42px, rounded down), not a uniform placeholder: the row is `flex-wrap`, so
   * the widths are what decide where it breaks. At these values the placeholder row
   * wraps exactly where the real row does — 3 rows in the 350px mobile column
   * (`gap-[7px]`), 2 rows in the 620px md: column (`md:gap-2.5`) — and a uniform
   * 130px bar collapsed it to 2 rows / 1 row, i.e. 51px and 54px of missing height.
   */
  protected readonly trustPillSkeletons = ['181px', '203px', '156px', '114px'] as const;
}
