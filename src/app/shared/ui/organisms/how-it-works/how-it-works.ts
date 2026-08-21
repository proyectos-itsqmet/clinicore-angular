import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { HowItWorks, HowItWorksStep } from '../../../../core/models';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { SectionHeading } from '../../atoms/section-heading/section-heading';
import { StepCard } from '../../molecules/step-card/step-card';

/** Bound to `app-step-card`'s required input while its own `loading` skeleton is showing. */
const EMPTY_STEP: HowItWorksStep = {
  id: '',
  number: 0,
  image: '',
  title: '',
  description: '',
};

/**
 * app-how-it-works — "Cómo funciona" (design/Main.dc.html section 7,
 * design/Mobile.dc.html "Tres pasos y estás dentro."): a heading and a
 * three-step grid, one `app-step-card` per step.
 *
 * `HowItWorks` is static, cacheable content per its own model comment, so
 * the loading window is brief, but the contract still applies: while
 * `loading()` is true each `app-step-card` paints its own skeleton (same
 * 200px photo height, same text block) so the grid never jumps once the
 * real steps arrive. The grid itself carries `aria-busy` during that
 * window; the cards stay in the DOM either way; only their own internal
 * branch swaps.
 */
@Component({
  selector: 'app-how-it-works',
  imports: [Skeleton, SectionHeading, StepCard],
  templateUrl: './how-it-works.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class HowItWorksSection {
  readonly data = input.required<HowItWorks>();
  readonly loading = input(false);

  /** Fixed placeholder count matching `jsons/landing/how-it-works.json`'s 3 steps. */
  protected readonly skeletonItems = [0, 1, 2] as const;
  protected readonly emptyStep = EMPTY_STEP;
}
