import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { QuickAccessItem } from '../../../../core/models';
import { Card } from '../card/card';
import { Icon, IconName } from '../../atoms/icon/icon';
import { Skeleton } from '../../atoms/skeleton/skeleton';

/**
 * app-access-tile — one tile of the task rail (design/Main.dc.html section
 * 3): an icon tile, a title and a subtitle. `emergency` tone paints the
 * whole card red with a white icon/text, matching the 24/7 tile; every
 * other tone is the neutral card with a tinted icon square.
 *
 * The icon isn't part of `QuickAccessItem` (the landing contract has no
 * icon field), so it arrives as its own input.
 */
@Component({
  selector: 'app-access-tile',
  imports: [Card, Icon, Skeleton],
  templateUrl: './access-tile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class AccessTile {
  readonly item = input.required<QuickAccessItem>();
  readonly icon = input.required<IconName>();
  readonly loading = input(false);

  protected readonly isEmergency = computed(() => this.item().tone === 'emergency');
}
