import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, TemplateRef, computed, contentChild, input } from '@angular/core';

export type MarqueeDirection = 'left' | 'right';

/**
 * app-marquee — the infinite ribbon (design/Main.dc.html `.mq` / `.mq-row`,
 * the convenios and reviews strips): the row it's given loops seamlessly,
 * fades at both edges, and pauses on hover.
 *
 * Angular can't clone projected content, so the row is authored once as an
 * `<ng-template>` and rendered twice internally — the second copy carries
 * `aria-hidden="true"` automatically, exactly as the boards do it by hand:
 *
 * ```html
 * <app-marquee direction="left" [durationSeconds]="38">
 *   <ng-template>
 *     <span class="...">...</span>
 *   </ng-template>
 * </app-marquee>
 * ```
 *
 * The two marquees in the boards run at 38s and 61s — deliberately not
 * multiples of each other, so they never resynchronize. Keep that in mind
 * when composing more than one on the same screen; the 38s default here
 * only covers a single instance.
 *
 * The 32px gap is not an input: the global `sc-l` / `sc-r` keyframes in
 * `shared/tokens/base.css` bake that exact value into their translateX
 * math, so changing it here would desync the loop.
 */
@Component({
  selector: 'app-marquee',
  imports: [NgTemplateOutlet],
  templateUrl: './marquee.html',
  styleUrl: './marquee.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Marquee {
  readonly direction = input<MarqueeDirection>('left');
  readonly durationSeconds = input(38);

  protected readonly row = contentChild(TemplateRef);

  protected readonly rowDirectionClass = computed(() => (this.direction() === 'left' ? 'mq-row-left' : 'mq-row-right'));
}
