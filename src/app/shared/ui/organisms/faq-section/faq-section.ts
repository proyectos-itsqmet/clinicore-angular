import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import type { Faq, PublicInsurance } from '../../../../core/models';
import { FaqItemComponent } from '../../molecules/faq-item/faq-item';
import { SkeletonGrid } from '../../molecules/skeleton-grid/skeleton-grid';
import { SectionHeading } from '../../atoms/section-heading/section-heading';
import { Kicker } from '../../atoms/kicker/kicker';
import { Skeleton } from '../../atoms/skeleton/skeleton';

/**
 * app-faq-section — "Preguntas frecuentes" + "Seguros públicos" (design/
 * Main.dc.html section 12). Two independently-fed pieces of content
 * sharing one section, exactly as the brief asks: the FAQ accordion
 * (composed from `app-faq-item`, one open by default matching the
 * board's initial `state.faq = 0`) plus the public-insurance requirements
 * panel (IESS / ISSFA / ISSPOL / MSP).
 *
 * `PublicInsuranceItem` (`name` + `requirements`) doesn't match
 * `FaqItem`'s shape (`question` + `answer`), and its rows use a visibly
 * different, more compact accordion style than `app-faq-item`'s card —
 * so this panel's toggle rows are authored directly in this organism
 * rather than forcing the wrong molecule onto the wrong shape. Its open/
 * closed state is local, one-at-a-time, independent from the FAQ list.
 *
 * `app-faq-item` has no `loading` input by design (see molecules/
 * README.md: static copy, no meaningful half-open skeleton geometry) —
 * its own loading state is reserved via `app-skeleton-grid` here instead,
 * per that molecule's documented contract. That run is deliberately split
 * 1 + 4 rather than a uniform 5: the first row is bound `[defaultOpen]="$first"`
 * and lands expanded, so its placeholder reserves the open height.
 *
 * The board's mobile mockup replaces this panel with a 4th FAQ question
 * ("¿Trabajan con IESS y aseguradoras?") instead of showing the panel at
 * all — read here as a space-saving edit to the *mockup's copy*, not an
 * instruction to drop the `PublicInsurance` data at that width. Both
 * pieces render at every width; the layout goes from a stacked single
 * column (mobile) to the board's two-column split (`md:` and up).
 */
@Component({
  selector: 'app-faq-section',
  imports: [FaqItemComponent, SkeletonGrid, SectionHeading, Kicker, Skeleton],
  templateUrl: './faq-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class FaqSection {
  readonly faq = input.required<Faq>();
  readonly publicInsurance = input.required<PublicInsurance>();
  readonly loading = input(false);

  protected readonly openInsuranceIndex = signal(-1);

  protected toggleInsurance(index: number): void {
    this.openInsuranceIndex.update((current) => (current === index ? -1 : index));
  }
}
