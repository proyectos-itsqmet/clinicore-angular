import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

/**
 * app-admin-placeholder-page — the body of every admin section that has not
 * been designed yet, which right now is all 31 of them.
 *
 * ONE component for all of them, reading its own title out of the route `data`
 * that `admin.routes.ts` generated from `ADMIN_NAV`. The alternative — 31 files
 * of identical boilerplate — would be 31 places to keep in sync with a menu
 * that is already the single source of truth, and every one of them would be
 * deleted anyway as its real section arrives.
 *
 * Replacing one is a one-line change: swap that route's `loadComponent`.
 *
 * It paints a MARKED placeholder, not filler. No fake tables, no decorative
 * charts, no numbers nobody measured. A section that visibly says "not built
 * yet" is honest; one that shows invented data teaches the reader to distrust
 * every number in the panel.
 */
@Component({
  selector: 'app-admin-placeholder-page',
  templateUrl: './admin-placeholder-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class AdminPlaceholderPage {
  private readonly route = inject(ActivatedRoute);

  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });

  protected readonly group = computed(() => {
    const value = this.data()['crumbGroup'];
    return typeof value === 'string' ? value : 'Panel';
  });

  protected readonly title = computed(() => {
    const value = this.data()['crumbLeaf'];
    return typeof value === 'string' ? value : 'Panel';
  });
}
