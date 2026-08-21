import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { MedicalRecord } from '../../../../core/models';
import { Card } from '../../molecules/card/card';
import { Icon } from '../../atoms/icon/icon';
import { Kicker } from '../../atoms/kicker/kicker';
import { LiveDot } from '../../atoms/live-dot/live-dot';
import { SectionHeading } from '../../atoms/section-heading/section-heading';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';

/** The last-digit odometer strip: current digit, then the next two, wrapping past 9. */
function odometerDigits(ticket: string): string[] | null {
  const match = /(\d)$/.exec(ticket);
  if (!match) {
    return null;
  }
  const digit = Number(match[1]);
  return [digit, (digit + 1) % 10, (digit + 2) % 10].map(String);
}

/**
 * app-medical-record-bento — the "Historia clínica" bento grid (design/
 * Main.dc.html section 9 / Mobile.dc.html "historial"): a large live
 * waiting-room screen tile (darkened photo, live dot, the gold turn
 * number with its odometer roll, and the scrolling upcoming-turns queue)
 * plus four benefit tiles, some with a side photo and some icon-only.
 *
 * Asset resolution is this organism's own job. It renders `<img>` tags
 * itself — the waiting-room background and the photo benefit tiles — so
 * it applies `| assetUrl` itself, per the ownership rule in molecules/
 * README.md: whichever component renders the `<img>` pipes, exactly once,
 * and callers pass the bare contract filename. Both filenames are read
 * straight off `record()` — the waiting-room one from
 * `MedicalRecordLiveScreen.image` (e.g. "waiting.jpg"), each tile's from
 * `MedicalRecordBenefit.image` — so there is no second, container-level
 * pipe left anywhere on the path.
 *
 * The odometer's last digit is derived from `liveScreen.currentTicket`
 * (its final character) rather than hardcoded, so it always lands at
 * rest on the real ticket value and only *animates through* the next
 * two digits for the "counting up" motion the board draws by hand.
 * Tickets that don't end in a digit fall back to a static, unanimated
 * label.
 *
 * `MedicalRecordBenefit.image` decides the tile shape per item — a
 * photo renders a row-layout `app-card`, `null` renders an icon-only
 * card. That `@if` alias deliberately tests the *raw* contract value,
 * which is why `| assetUrl` is applied on the `<img>`'s own binding and
 * not on the alias. The model has no icon field, so the icon-less
 * shape always shows the `shield` icon (the only icon-less benefit in
 * the current fixture is the access-control one); flagged in the
 * delivery report.
 */
@Component({
  selector: 'app-medical-record-bento',
  imports: [AssetUrlPipe, Card, Icon, Kicker, LiveDot, SectionHeading, Skeleton],
  templateUrl: './medical-record-bento.html',
  styleUrl: './medical-record-bento.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class MedicalRecordBento {
  readonly record = input.required<MedicalRecord>();
  readonly loading = input(false);

  protected readonly skeletonBenefits = [0, 1, 2, 3];

  protected readonly ticketDigits = computed(() => odometerDigits(this.record().liveScreen.currentTicket));
  protected readonly ticketPrefix = computed(() => {
    const ticket = this.record().liveScreen.currentTicket;
    return this.ticketDigits() ? ticket.slice(0, -1) : ticket;
  });
}
