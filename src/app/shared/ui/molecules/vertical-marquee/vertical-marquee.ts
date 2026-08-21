import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, TemplateRef, contentChild, input } from '@angular/core';

/**
 * app-vertical-marquee — `app-marquee` on the other axis: the row it is given
 * loops seamlessly downward-to-upward, fades at both edges, and never shows a
 * seam.
 *
 * Authored for the waiting-room display's called-turns column
 * (`design/pantalla-turnos/`). It is deliberately NOT the design boards'
 * `.qroll` / `qshift`, which is a DISCRETE three-step jump
 * (`translateY(0 / -38px / -76px)` with `steps(1, end)`) — fine for five
 * decorative items in the landing's bento widget, wrong for a real queue on a
 * TV.
 *
 * Same projection trick as `app-marquee`, for the same reason: Angular cannot
 * clone projected content, so the row is authored once as an `<ng-template>`
 * and rendered twice internally, the second copy carrying `aria-hidden="true"`
 * automatically.
 *
 * ```html
 * <app-vertical-marquee [durationSeconds]="34" [animate]="rows.length > 6">
 *   <ng-template>
 *     <div class="...">...</div>
 *   </ng-template>
 * </app-vertical-marquee>
 * ```
 *
 * TWO INVARIANTS carry this component. Break either and the loop shows a
 * visible defect exactly once per lap, which is the hardest kind of bug to
 * catch by looking.
 *
 * 1 · THE GAPS MUST MATCH. The container's gap (between the two copies), the
 *     strip's gap (between rows) and the keyframe's offset are the same
 *     number. `translateY(calc(-100% - gap))` moves each strip by its own
 *     height plus one gap, which lands copy 2 exactly where copy 1 was — and
 *     `-100%` being the STRIP's height, not the container's, is why the CSS
 *     never needs to know how many rows there are.
 *
 *     This is where `app-marquee` had to compromise: its `sc-l` / `sc-r`
 *     keyframes live in `shared/tokens/base.css` with `32px` BAKED IN, so its
 *     own doc comment has to warn that the gap is not an input. `vq-roll`
 *     reads `var(--vq-gap)` off the animated element instead, so here the gap
 *     genuinely is an input and cannot desync.
 *
 * 2 · THE STRIP MUST BE AT LEAST AS TALL AS THE WINDOW. Otherwise, for part of
 *     the cycle copy 1 has already left the top and copy 2 has not reached the
 *     bottom, and a gap opens that neither covers.
 *
 *     That is what `animate` is for, and why the caller decides: only the
 *     caller knows its own row height and window height. The good news is the
 *     failing condition and "there is nothing to scroll" are the SAME
 *     condition — a list shorter than the window fits in it — so `animate:
 *     false` is the correct behaviour, not a degraded fallback. With it off the
 *     component renders ONE copy, drops the animation, and drops the edge mask
 *     too (fading the ends of a list that is fully visible would just look
 *     broken).
 *
 * SIZING: the host is `display: contents`, so `.vq` is what the parent lays
 * out. It declares `flex: 1 1 0%; min-height: 0`, which means it fills the
 * remaining space of a flex COLUMN and can shrink enough for `overflow:
 * hidden` to actually clip. In any other kind of parent the caller must give it
 * a bounded height, or nothing clips and the loop scrolls out of view.
 */
@Component({
  selector: 'app-vertical-marquee',
  imports: [NgTemplateOutlet],
  templateUrl: './vertical-marquee.html',
  styleUrl: './vertical-marquee.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class VerticalMarquee {
  readonly durationSeconds = input(34);
  /**
   * Any CSS length. Used for BOTH gaps and read by the `vq-roll` keyframe, so
   * the three can never drift apart — see invariant 1.
   */
  readonly gap = input('0.75rem');
  /** See invariant 2: `false` renders one static copy, no animation, no mask. */
  readonly animate = input(true);

  protected readonly row = contentChild(TemplateRef);
}
