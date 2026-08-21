import { ChangeDetectionStrategy, Component, input } from '@angular/core';
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

/**
 * app-hero-section — the full-bleed photograph with Ken Burns drift,
 * the text column and the availability panel (design/Main.dc.html
 * section 2 / Mobile.dc.html "HERO"). `position: relative`, height
 * 822px desktop / 780px mobile; `app-site-header` floats absolutely
 * on top of it (see that component's doc comment for the exact 156px
 * top-padding dependency — do not change this section's top padding
 * without reading that first).
 *
 * Per `Hero`'s own doc comment, only `availability` is genuinely live
 * data (today's open-slot count); the kicker/title/pills/CTAs are
 * static copy delivered with the same payload. That copy still arrives
 * over the same endpoint, though, so `loading` has to cover it: while
 * the resource is in flight the bound value is the EMPTY_HERO fixture
 * (blank strings, zero `trustPills`), and rendering it would paint an
 * empty `<h1>`, an empty lead and two content-less 58px CTA pills. The
 * text column, the availability panel and the mobile availability bar
 * therefore each have their own skeleton branch with fixed geometry —
 * `trustPillSkeletons` is a literal 4 matching jsons/landing/hero.json,
 * not `hero().trustPills.length`, which is 0 exactly when it is needed.
 *
 * Both photographs are guarded on a non-empty filename rather than
 * rendered unconditionally: `AssetUrlPipe` returns '' for the empty
 * fixture value, and `<img src="">` is invalid HTML that browsers
 * resolve against the document URL. The guard is not a loading state,
 * though — it is false exactly while loading — so the desktop inset
 * takes a skeleton branch ahead of it that reserves the frame's real
 * 300 x 373.5px box; the full-bleed background needs none, the host's
 * own `bg-navy-deep` covers it.
 *
 * The desktop layout is a two-column grid (text + framed inset photo
 * with a floating glass availability panel); mobile drops the inset
 * photo entirely and turns the availability panel into a full-width
 * bar pinned near the bottom of the photograph — not a resize of the
 * same layout, a genuinely different composition per board.
 */
@Component({
  selector: 'app-hero-section',
  imports: [Button, Figure, Icon, Kicker, LiveDot, Pill, Skeleton, PhotoFrame, AssetUrlPipe],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block h-[780px] overflow-hidden bg-navy-deep on-dark md:h-[822px]' },
})
export class HeroSection {
  readonly hero = input.required<Hero>();
  readonly loading = input(false);

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
