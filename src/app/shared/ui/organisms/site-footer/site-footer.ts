import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { LocationItem, Site } from '../../../../core/models';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { SkeletonGrid } from '../../molecules/skeleton-grid/skeleton-grid';

/**
 * app-site-footer — the closing footer (design/Main.dc.html section 14 /
 * Mobile.dc.html "contacto"): brand identity, the medical-director
 * disclosure, specialty/patient link columns, sede contact boxes, and the
 * bottom LOPDP / ACESS / RUC / legal-links strip.
 *
 * `Site` has no sede data (that's `LocationItem`, defined for the
 * locations section), so the footer's sede boxes arrive as their own
 * `locations` input reusing that exact type — the shapes already match
 * one-for-one, so no new ad-hoc type is introduced.
 *
 * Both boards' mockups trim content at the mobile width that this
 * organism still renders in full at every width, on purpose:
 * - the "Responsable sanitario" (medical director) box, since a
 *   regulatory identity disclosure shouldn't disappear because of
 *   viewport width;
 * - every entry of `locations`, not just the board's example one/two
 *   sede boxes;
 * - the bottom Términos / Privacidad / Consentimiento links, which the
 *   mobile mockup drops entirely rather than just reflowing.
 * These are judgment calls flagged in the delivery report, not literal
 * copies of the mobile board's omissions.
 *
 * The link columns are intentionally taller than the boards draw them:
 * every footer anchor carries `inline-flex min-h-11 items-center` so its
 * hit box clears the project's 44px floor. A bare `text-meta` line box is
 * 20.3px (14px × 1.45) and `text-cap` 18.2px, and the `gap-3` between rows
 * is only 12px — so the pseudo-element expansion `app-location-card` uses
 * would make neighbouring targets overlap here. Growing the row is the
 * correct trade; do not compress it back to the board's exact height.
 *
 * The floating WhatsApp button (`.fab`) and the mobile sticky action bar
 * (`.actionbar`) are page-level chrome positioned outside the document
 * flow in both boards — not part of any one section — so they are
 * deliberately not included here; flagged in the report for whoever
 * assembles the page shell.
 */
@Component({
  selector: 'app-site-footer',
  imports: [Skeleton, SkeletonGrid],
  templateUrl: './site-footer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SiteFooter {
  readonly site = input.required<Site>();
  readonly locations = input<LocationItem[]>([]);
  readonly loading = input(false);

  /**
   * Skeleton repeat counts, as fixed literals taken from the contract
   * fixtures — never from `site()`, which is the empty fixture while
   * `loading` is true and would render nothing at all.
   * `site.json`: `footer.specialtyLinks` and `footer.patientLinks` are 5
   * each, `footer.legalLinks` is 3. The sede boxes' own count (2, from
   * `locations.json`) is a literal on `app-skeleton-grid` in the template.
   */
  protected readonly skeletonLinkRows = [0, 1, 2, 3, 4];
  protected readonly skeletonLegalLinks = [0, 1, 2];
}
