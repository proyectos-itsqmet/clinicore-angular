import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, viewChildren } from '@angular/core';

/**
 * app-segmented — the segmented control with a sliding pill (design/
 * Main.dc.html `.seg` / `.seg-thumb`, the Especialidades tab switch). The
 * thumb's width and position are both expressed as percentages of its own
 * track, so any number of `options` slides correctly, not just three.
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

  protected readonly gridTemplateColumns = computed(() => `repeat(${this.options().length}, minmax(0, 1fr))`);
  protected readonly thumbWidth = computed(() => `calc((100% - 8px) / ${this.options().length})`);
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
