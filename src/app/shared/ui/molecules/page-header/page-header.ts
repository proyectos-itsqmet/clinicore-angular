import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * app-page-header — the title block at the top of every admin section: the
 * mobile-only group label, the `<h1>`, an optional lead line, and the slot
 * where that section's own actions live.
 *
 * THIS COMPONENT WAS ASKED FOR BY NAME. `admin-placeholder-page.html` and
 * `admin-layout.ts` both carry the note that the board's page-header actions
 * ("Exportar", "Nuevo") do not belong in the shell because they are
 * section-specific — "su lugar es un `app-page-header` compartido cuando
 * existan las secciones reales". The sections now exist, so here it is, and
 * the placeholder composes it too: one recipe for the panel's page title, not
 * one per section.
 *
 * THE ACTIONS SLOT IS A SLOT, NOT AN INPUT. A section's actions are buttons
 * with handlers, not data — passing labels and callbacks through inputs would
 * make this molecule the owner of behaviour it cannot possibly understand.
 * Project `<app-button>`s into `[headerActions]` and it stays presentational.
 *
 * `kicker` repeats the breadcrumb group and is `lg:hidden` on purpose: the
 * shell's top bar drops its breadcrumb under `lg:` to make room for the brand,
 * so this is where "which branch am I in" comes back on a phone. Above `lg:`
 * it would be the same string twice on one screen.
 */
@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PageHeader {
  readonly heading = input.required<string>();
  /** The breadcrumb group. Rendered under `lg:` only — see the class doc. */
  readonly kicker = input<string | undefined>(undefined);
  /** One line of context under the title. Omitted when empty. */
  readonly description = input<string | undefined>(undefined);
}
