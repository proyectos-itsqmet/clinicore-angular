import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { HowItWorksStep } from '../../../../core/models';
import { Card } from '../card/card';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';

/**
 * app-step-card — one card of "Cómo funciona" (design/Main.dc.html section
 * 7): a 200px photo with the big step number overlaid on its lower-left
 * corner, then a title and description.
 */
@Component({
  selector: 'app-step-card',
  imports: [Card, Skeleton, AssetUrlPipe],
  templateUrl: './step-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class StepCard {
  readonly step = input.required<HowItWorksStep>();
  readonly loading = input(false);

  protected readonly paddedNumber = computed(() => String(this.step().number).padStart(2, '0'));
}
