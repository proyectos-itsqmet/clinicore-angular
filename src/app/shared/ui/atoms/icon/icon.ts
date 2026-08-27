import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Icon set extracted from the approved design boards. `clock`,
 * `location` and `user` are not drawn anywhere in Main.dc.html /
 * Mobile.dc.html — they were added to complete the set the brief
 * asks for, matching the same 24x24 / 2px-stroke / round-cap visual
 * language as the rest.
 *
 * The last seven (`grid` through `banknote`) exist for the admin panel's
 * navigation: it has twelve first-level groups and only five of the icons
 * above could serve one (`shield`, `clock`, `calendar`, `user`, `document`).
 * They are not in any board either — `design/panel-admin/` is where they were
 * drawn — and they follow the same visual language.
 *
 * `chevron` is the eighth, and its absence until now was a real hole: it is
 * the disclosure glyph every expandable row needs. `arrow` is not a
 * substitute — it carries a shaft and reads as "go", not as "open".
 * See atoms/README.md.
 */
export type IconName =
  | 'calendar'
  | 'document'
  | 'capsule'
  | 'phone'
  | 'check'
  | 'arrow'
  | 'whatsapp'
  | 'chat'
  | 'shield'
  | 'star'
  | 'plus'
  | 'menu'
  | 'clock'
  | 'location'
  | 'user'
  | 'grid'
  | 'chart'
  | 'box'
  | 'droplet'
  | 'tag'
  | 'ban'
  | 'banknote'
  | 'chevron';

/**
 * app-icon — a single component that draws every icon in the system
 * from an internal map, selected by name. Decorative by default
 * (`aria-hidden="true"`); pass `label` to make it a meaningful `img`.
 *
 * Color comes from `currentColor` (set it via a Tailwind text-* class
 * on an ancestor, or directly on `<app-icon class="text-...">`), not
 * from an input — the icon never knows what color role it is playing.
 * `star` is the one exception: it always renders the fixed gold fill
 * with the star-ring outline from the design, because that is the
 * only way it is ever used in the boards.
 */
@Component({
  selector: 'app-icon',
  templateUrl: './icon.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  readonly strokeWidth = input(2);
  readonly label = input<string | undefined>(undefined);
}
