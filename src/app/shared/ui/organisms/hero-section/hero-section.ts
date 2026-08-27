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
import { ChatPanelService } from '../../../../core/chat/chat-panel.service';

@Component({
  selector: 'app-hero-section',
  imports: [Button, Figure, Icon, Kicker, LiveDot, Pill, Skeleton, PhotoFrame, AssetUrlPipe],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `min-h` on mobile, not `h`. The height used to be a hard `h-[780px]` at
  // every width, which on a phone leaves 526px of content budget once the
  // 104px of top padding (the space the floating header sits in) and the
  // 150px of bottom padding are taken out. The real column — kicker, a
  // three-line title, a four-line lead, three rows of pills and two CTAs —
  // measures more than that, and `overflow-hidden` simply cut whatever did
  // not fit. Growing the section instead is the only version that cannot
  // hide a call to action on a narrow screen.
  //
  // Desktop keeps an exact height: the availability card and the stat card in
  // the right column are absolutely positioned against it (`top-[248px]`),
  // so there the number IS the layout.
  host: {
    class:
      'relative flex flex-col min-h-[780px] overflow-hidden bg-navy-deep on-dark md:h-[822px]',
  },
})
export class HeroSection {
  private readonly authService = inject(AuthService);
  private readonly chatPanel = inject(ChatPanelService);

  readonly hero = input.required<Hero>();
  readonly loading = input(false);

  /**
   * Opens the assistant panel that `app-chat-widget` draws.
   *
   * Through the service rather than through an output the page would have to
   * forward: the hero does not know where the widget is rendered, and it
   * should not have to. See [ChatPanelService].
   */
  protected openChat(): void {
    this.chatPanel.open();
  }

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
