import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { QuickAccess, QuickAccessItem } from '../../../../core/models';
import { AccessTile } from '../../molecules/access-tile/access-tile';
import type { IconName } from '../../atoms/icon/icon';

/** Bound to `app-access-tile`'s required input while its own `loading` skeleton is showing. */
const EMPTY_QUICK_ACCESS_ITEM: QuickAccessItem = {
  id: '',
  title: '',
  subtitle: '',
  href: '',
  tone: 'default',
};

/**
 * app-quick-access-rail — the four-tile task rail directly below the
 * hero (design/Main.dc.html section 3 / Mobile.dc.html "TASK RAIL").
 *
 * Deliberately uses real `padding-top` (64px desktop / 36px mobile) to
 * clear the hero, never a negative margin pulled up over it. A
 * negative margin on this section's own box collapses *outward* and
 * drags the whole section up with it — that exact bug has already
 * been paid for twice in this project. Don't reintroduce it here.
 *
 * `QuickAccessItem` carries no icon field (the landing contract has
 * none), so this organism — the one layer in `shared/ui` allowed to
 * know it's composing a specific four-tile product section — maps
 * each tile to an icon by its position and tone rather than by
 * inspecting `id` strings: the emergency-toned tile always gets
 * `phone`, and the other three walk a fixed icon list in the order
 * the boards draw them (agenda, historia, resultados).
 */
@Component({
  selector: 'app-quick-access-rail',
  imports: [AccessTile],
  templateUrl: './quick-access-rail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative z-[5] block bg-field pt-9 md:pt-16' },
})
export class QuickAccessRail {
  readonly quickAccess = input.required<QuickAccess>();
  readonly loading = input(false);

  private readonly defaultTileIcons: readonly IconName[] = ['calendar', 'document', 'capsule'];

  /** Fixed placeholder count matching `jsons/landing/quick-access.json`'s 4 items. */
  protected readonly skeletonItems = [0, 1, 2, 3] as const;
  protected readonly emptyItem = EMPTY_QUICK_ACCESS_ITEM;

  protected iconFor(item: QuickAccessItem, index: number): IconName {
    if (item.tone === 'emergency') {
      return 'phone';
    }
    return this.defaultTileIcons[index] ?? 'calendar';
  }
}
