import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { Coverage } from '../../../../core/models';
import { Button } from '../../atoms/button/button';
import { Icon } from '../../atoms/icon/icon';
import { Kicker } from '../../atoms/kicker/kicker';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';
import { AuthService } from '../../../../core/auth/auth.service';

/**
 * app-closing-cta — the closing "Agenda en línea" band (design/
 * Main.dc.html section 13): headline + two CTAs over a darkened photo,
 * next to the coverage panel (`Coverage.rows` vs. `noPlanRow`).
 */
@Component({
  selector: 'app-closing-cta',
  imports: [AssetUrlPipe, CurrencyPipe, Button, Icon, Kicker, Skeleton],
  templateUrl: './closing-cta.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ClosingCta {
  private readonly authService = inject(AuthService);

  readonly coverage = input.required<Coverage>();
  readonly loading = input(false);

  protected readonly primaryCtaHref = computed(() => {
    return this.authService.isAuthenticated() ? '/agendar' : '/registro';
  });
}
