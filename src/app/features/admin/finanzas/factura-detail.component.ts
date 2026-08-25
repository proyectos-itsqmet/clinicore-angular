import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { ClaimApiService } from '../../../core/api/claim-api.service';
import { InvoiceApiService } from '../../../core/api/invoice-api.service';
import { PaymentApiService } from '../../../core/api/payment-api.service';
import type { Invoice, PaymentMethod } from '../../../core/models';
import { extractApiErrorMessage, isPermissionDeniedError } from '../metrics-shared/turn-status.util';
import {
  INVOICE_LINE_SOURCE_LABELS,
  INVOICE_STATUS_BADGE_CLASS,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  formatIsoDateTimeEs,
  formatMoney,
  sumPaymentAmounts,
} from './finanzas.util';

/**
 * app-factura-detail — "Finanzas > Facturación > detalle"
 * (`GET /api/invoices/{id}`, `POST /api/invoices/{id}/payments`, `PUT
 * /api/invoices/{id}/void`, `POST /api/claims`).
 *
 * Money-correctness contract, enforced by construction (not just convention):
 * - Line item amounts, `total` and `balance` are rendered EXACTLY as
 *   `InvoiceDTO` returns them. Nothing here recomputes a total from a
 *   service's current price, and `balance` is never re-derived as
 *   `total - sum(payments)` client-side — the server already computed it.
 * - After a successful payment, the WHOLE invoice is reloaded from the
 *   server rather than patched locally, so balance/status/payments can never
 *   drift from each other.
 * - VOID is the only "removal" mechanism (no delete affordance anywhere);
 *   it requires a reason and is disabled once the invoice is PAID/VOID.
 * - A claim's accept/reject/mark-paid never touches this page's total or
 *   balance display — see `ClaimService#reject` docblock.
 */
@Component({
  selector: 'app-factura-detail',
  imports: [FormsModule],
  templateUrl: './factura-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacturaDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly invoiceApi = inject(InvoiceApiService);
  private readonly paymentApi = inject(PaymentApiService);
  private readonly claimApi = inject(ClaimApiService);

  protected readonly formatMoney = formatMoney;
  protected readonly formatIsoDateTimeEs = formatIsoDateTimeEs;
  protected readonly sumPaymentAmounts = sumPaymentAmounts;
  protected readonly INVOICE_STATUS_LABELS = INVOICE_STATUS_LABELS;
  protected readonly INVOICE_STATUS_BADGE_CLASS = INVOICE_STATUS_BADGE_CLASS;
  protected readonly INVOICE_LINE_SOURCE_LABELS = INVOICE_LINE_SOURCE_LABELS;
  protected readonly PAYMENT_METHOD_LABELS = PAYMENT_METHOD_LABELS;
  protected readonly PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'TRANSFER'];

  protected readonly invoice = signal<Invoice | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  private invoiceId = 0;

  /** Only TURN lines ever carry insurer coverage — the action is hidden (not merely disabled) when there is nothing to claim. */
  protected readonly hasInsurerCoverage = computed(() => (this.invoice()?.items ?? []).some((item) => (item.insurerCoveredAmount ?? 0) > 0));

  protected readonly canVoid = computed(() => {
    const status = this.invoice()?.status;
    return status != null && status !== 'PAID' && status !== 'VOID';
  });

  // --- Modal: registrar pago ---
  protected readonly isPaymentModalOpen = signal<boolean>(false);
  protected readonly paymentFormLoading = signal<boolean>(false);
  protected readonly paymentFormError = signal<string | null>(null);
  protected readonly paymentSubmitAttempted = signal<boolean>(false);
  protected readonly paymentAmount = signal<string>('');
  protected readonly paymentMethod = signal<PaymentMethod>('CASH');
  protected readonly paymentReference = signal<string>('');
  protected readonly paymentFormValid = computed(() => Number(this.paymentAmount()) > 0);

  // --- Modal: anular factura ---
  protected readonly isVoidModalOpen = signal<boolean>(false);
  protected readonly voidFormLoading = signal<boolean>(false);
  protected readonly voidFormError = signal<string | null>(null);
  protected readonly voidSubmitAttempted = signal<boolean>(false);
  protected readonly voidReason = signal<string>('');
  protected readonly voidFormValid = computed(() => this.voidReason().trim() !== '');

  // --- Reclamo ---
  protected readonly claimSubmitting = signal<boolean>(false);
  protected readonly claimError = signal<string | null>(null);
  protected readonly claimSuccess = signal<string | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;

    if (!Number.isFinite(id)) {
      this.error.set('Identificador de factura no válido.');
      this.loading.set(false);
      return;
    }

    this.invoiceId = id;
    this.loadInvoice();
  }

  loadInvoice(): void {
    this.loading.set(true);
    this.error.set(null);

    this.invoiceApi.getById(this.invoiceId).subscribe({
      next: (inv) => {
        this.invoice.set(inv);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudo cargar la factura.'));
        this.loading.set(false);
      },
    });
  }

  // --- Registrar pago ---
  openPaymentModal(): void {
    this.paymentAmount.set('');
    this.paymentMethod.set('CASH');
    this.paymentReference.set('');
    this.paymentSubmitAttempted.set(false);
    this.paymentFormError.set(null);
    this.isPaymentModalOpen.set(true);
  }

  closePaymentModal(): void {
    this.isPaymentModalOpen.set(false);
  }

  onPaymentAmountInput(event: Event): void {
    this.paymentAmount.set((event.target as HTMLInputElement).value);
  }

  onPaymentMethodChange(event: Event): void {
    this.paymentMethod.set((event.target as HTMLSelectElement).value as PaymentMethod);
  }

  onPaymentReferenceInput(event: Event): void {
    this.paymentReference.set((event.target as HTMLInputElement).value);
  }

  onSubmitPayment(): void {
    this.paymentSubmitAttempted.set(true);
    if (!this.paymentFormValid()) {
      return;
    }

    this.paymentFormLoading.set(true);
    this.paymentFormError.set(null);
    const reference = this.paymentReference().trim();

    this.paymentApi
      .create(this.invoiceId, {
        amount: Number(this.paymentAmount()),
        method: this.paymentMethod(),
        ...(reference ? { reference } : {}),
      })
      .subscribe({
        next: () => {
          this.paymentFormLoading.set(false);
          this.closePaymentModal();
          this.loadInvoice();
        },
        error: (err) => {
          this.paymentFormLoading.set(false);
          this.paymentFormError.set(extractApiErrorMessage(err, 'No se pudo registrar el pago.'));
        },
      });
  }

  // --- Anular factura ---
  openVoidModal(): void {
    this.voidReason.set('');
    this.voidSubmitAttempted.set(false);
    this.voidFormError.set(null);
    this.isVoidModalOpen.set(true);
  }

  closeVoidModal(): void {
    this.isVoidModalOpen.set(false);
  }

  onVoidReasonInput(event: Event): void {
    this.voidReason.set((event.target as HTMLTextAreaElement).value);
  }

  onSubmitVoid(): void {
    this.voidSubmitAttempted.set(true);
    if (!this.voidFormValid()) {
      return;
    }

    this.voidFormLoading.set(true);
    this.voidFormError.set(null);

    this.invoiceApi.voidInvoice(this.invoiceId, this.voidReason().trim()).subscribe({
      next: (updated) => {
        this.voidFormLoading.set(false);
        this.closeVoidModal();
        this.invoice.set(updated);
      },
      error: (err) => {
        this.voidFormLoading.set(false);
        const message = extractApiErrorMessage(err, 'No se pudo anular la factura.');
        this.voidFormError.set(
          isPermissionDeniedError(err, message) ? 'No tienes permisos para esta acción: solo un Administrador puede anular facturas.' : message,
        );
      },
    });
  }

  // --- Presentar reclamo ---
  submitClaim(): void {
    this.claimSubmitting.set(true);
    this.claimError.set(null);
    this.claimSuccess.set(null);

    this.claimApi.create(this.invoiceId).subscribe({
      next: () => {
        this.claimSubmitting.set(false);
        this.claimSuccess.set('Reclamo presentado. Puedes revisarlo en Finanzas > Reclamos.');
      },
      error: (err) => {
        this.claimSubmitting.set(false);
        this.claimError.set(extractApiErrorMessage(err, 'No se pudo presentar el reclamo.'));
      },
    });
  }
}
