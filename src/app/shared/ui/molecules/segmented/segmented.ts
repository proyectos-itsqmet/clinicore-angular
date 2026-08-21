import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, viewChildren } from '@angular/core';

/**
 * app-segmented — the segmented control with a sliding pill (design/
 * Main.dc.html `.seg` / `.seg-thumb` on desktop, design/Mobile.dc.html
 * `.segscroll` / `.seg` on mobile, the Especialidades group switch). Any
 * number of `options` slides correctly, not just three.
 *
 * The control is responsible for its OWN width. It fills its container below
 * `md:` and sizes to its content above, and it can never be wider than the box
 * it is given — long labels either scroll (mobile) or ellipsise, never spill.
 * That is deliberate: `options` is API data, so a consumer that hard-codes a
 * width for it is guessing. See segmented.css for the full geometry note.
 *
 * Controlled component: `selectedIndex` is an input, changes are reported
 * through `selectedIndexChange` (bindable as `[(selectedIndex)]`) rather
 * than owned internally, since the organism using this to switch panels
 * needs to react to the same index.
 *
 * Deliberately NOT the ARIA tab pattern. It used to declare
 * `role="tablist"` / `role="tab"` / `aria-selected` without ever wiring
 * `aria-controls`, and no consumer ever rendered a `role="tabpanel"` — so
 * assistive tech announced "tab, 1 of 3, selected" and then found no panel
 * to follow. A half-declared pattern is worse than none. This is a
 * single-select group of toggle buttons carrying `aria-pressed`, exactly
 * the contract `app-chip` already uses for the same job; the sliding thumb
 * is `aria-hidden` decoration, not an owned element of anything.
 *
 * Every button stays in the tab order (no roving tabindex — that only
 * belongs to a composite widget with a group role, and without one it just
 * hides the other options from a keyboard user). Arrow/Home/End are kept
 * on top of that as a nicety, not as the only way in.
 */
@Component({
  selector: 'app-segmented',
  templateUrl: './segmented.html',
  styleUrl: './segmented.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Segmented {
  readonly options = input.required<readonly string[]>();
  readonly selectedIndex = input(0);
  readonly selectedIndexChange = output<number>();

  protected readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  /**
   * The ONLY geometry left in TypeScript. The track count, the thumb's width
   * and the desktop `min-width` all derive from the `--seg-count` custom
   * property in segmented.css, because the two boards size the tracks
   * differently (116px fixed on mobile, `1fr` on desktop) and a `computed()`
   * cannot see the breakpoint.
   *
   * `100%` here is 100% of the THUMB's own width, not the track's — which is
   * why this one expression is breakpoint-agnostic and survives that split:
   * the CSS always sets the thumb to exactly one track wide, so `i * 100%`
   * lands on track `i` whether a track is 116px or a resolved `1fr`.
   */
  protected readonly thumbTransform = computed(() => `translateX(calc(${this.selectedIndex()} * 100%))`);

  protected select(index: number): void {
    this.selectedIndexChange.emit(index);
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const count = this.options().length;
    let next: number | undefined;
    switch (event.key) {
      case 'ArrowRight':
        next = (index + 1) % count;
        break;
      case 'ArrowLeft':
        next = (index - 1 + count) % count;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.select(next);
    this.tabButtons()[next]?.nativeElement.focus();
  }
}
