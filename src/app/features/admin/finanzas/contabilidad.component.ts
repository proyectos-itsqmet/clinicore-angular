import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AccountingApiService } from '../../../core/api/accounting-api.service';
import type { AccountingSummary, ClaimsSummary } from '../../../core/models';
import { extractApiErrorMessage } from '../metrics-shared/turn-status.util';
import {
  CLAIM_STATUS_BADGE_CLASS,
  CLAIM_STATUS_LABELS,
  INVOICE_STATUS_BADGE_CLASS,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_BADGE_CLASS,
  PAYMENT_METHOD_LABELS,
  formatMoney,
} from './finanzas.util';

/**
 * app-contabilidad — "Finanzas > Contabilidad"
 * (`GET /api/accounting/summary`, `GET /api/accounting/claims-summary`). A
 * REPORT, not a fourth CRUD: `invoicedByStatus`/`collectedByMethod`/
 * `claimsByStatus` are PERIOD-bound by the `[from, to]` filter below, but
 * `outstandingNow` is deliberately rendered in its OWN section, always
 * fetched and displayed regardless of the date range — it answers "what is
 * owed right now", not "what happened in this period". Never put it behind
 * the date filter as if it were a period figure.
 *
 * Bars are hand-rolled CSS width-percentage bars (no charting dependency),
 * same spirit as `metrics-shared/turns-series-chart.component` but over
 * categorical data (status/method) instead of a daily time series.
 */
@Component({
  selector: 'app-contabilidad',
  imports: [FormsModule],
  templateUrl: './contabilidad.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContabilidadComponent implements OnInit {
  private readonly accountingApi = inject(AccountingApiService);

  protected readonly formatMoney = formatMoney;
  protected readonly INVOICE_STATUS_LABELS = INVOICE_STATUS_LABELS;
  protected readonly INVOICE_STATUS_BADGE_CLASS = INVOICE_STATUS_BADGE_CLASS;
  protected readonly PAYMENT_METHOD_LABELS = PAYMENT_METHOD_LABELS;
  protected readonly PAYMENT_METHOD_BADGE_CLASS = PAYMENT_METHOD_BADGE_CLASS;
  protected readonly CLAIM_STATUS_LABELS = CLAIM_STATUS_LABELS;
  protected readonly CLAIM_STATUS_BADGE_CLASS = CLAIM_STATUS_BADGE_CLASS;

  protected readonly rangeFrom = signal<string>('');
  protected readonly rangeTo = signal<string>('');

  protected readonly summary = signal<AccountingSummary | null>(null);
  protected readonly claimsSummary = signal<ClaimsSummary | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly claimsSummaryError = signal<string | null>(null);

  protected readonly maxInvoicedAmount = computed(() => Math.max(1, ...(this.summary()?.invoicedByStatus ?? []).map((row) => row.totalAmount)));
  protected readonly maxCollectedAmount = computed(() => Math.max(1, ...(this.summary()?.collectedByMethod ?? []).map((row) => row.totalAmount)));
  protected readonly maxClaimedAmount = computed(() => Math.max(1, ...(this.claimsSummary()?.claimsByStatus ?? []).map((row) => row.totalAmount)));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const from = this.rangeFrom() || undefined;
    const to = this.rangeTo() || undefined;

    this.accountingApi.getSummary(from, to).subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudo generar el resumen contable.'));
        this.loading.set(false);
      },
    });

    // Supplementary to the main summary — a failure here does not block the
    // rest of the report, but it is still surfaced (never a silent empty section).
    this.claimsSummaryError.set(null);
    this.accountingApi.getClaimsSummary(from, to).subscribe({
      next: (data) => this.claimsSummary.set(data),
      error: (err) => {
        this.claimsSummary.set(null);
        this.claimsSummaryError.set(extractApiErrorMessage(err, 'No se pudo generar el resumen de reclamos.'));
      },
    });
  }

  onRangeFromChange(value: string): void {
    this.rangeFrom.set(value);
    this.load();
  }

  onRangeToChange(value: string): void {
    this.rangeTo.set(value);
    this.load();
  }

  protected barWidth(amount: number, max: number): string {
    return `${Math.max(2, (amount / max) * 100)}%`;
  }
}
