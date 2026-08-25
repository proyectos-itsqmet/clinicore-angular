import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ClaimApiService } from '../../../core/api/claim-api.service';
import type { Claim, ClaimStatus, Page } from '../../../core/models';
import { extractApiErrorMessage } from '../metrics-shared/turn-status.util';
import { CLAIM_STATUS_BADGE_CLASS, CLAIM_STATUS_LABELS, formatIsoDateTimeEs, formatMoney } from './finanzas.util';

/**
 * app-reclamos-list — "Finanzas > Reclamos" (`GET/PUT /api/claims/**`).
 * SUBMITTED -> ACCEPTED -> PAID is the happy path; SUBMITTED -> REJECTED is
 * terminal (no reopening — a brand-new claim is the deliberately minimal
 * answer, see `ClaimStatus` docblock). No delete affordance anywhere: there
 * is no `@DeleteMapping` on `ClaimController` at all.
 */
@Component({
  selector: 'app-reclamos-list',
  imports: [FormsModule],
  templateUrl: './reclamos-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReclamosListComponent implements OnInit {
  private readonly claimApi = inject(ClaimApiService);

  protected readonly formatMoney = formatMoney;
  protected readonly formatIsoDateTimeEs = formatIsoDateTimeEs;
  protected readonly CLAIM_STATUS_LABELS = CLAIM_STATUS_LABELS;
  protected readonly CLAIM_STATUS_BADGE_CLASS = CLAIM_STATUS_BADGE_CLASS;

  protected readonly data = signal<Page<Claim> | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filterStatus = signal<ClaimStatus | ''>('');

  protected readonly processingId = signal<number | null>(null);
  protected readonly actionError = signal<string | null>(null);

  // --- Modal: rechazar reclamo ---
  protected readonly isRejectModalOpen = signal<boolean>(false);
  protected readonly rejectingClaim = signal<Claim | null>(null);
  protected readonly rejectReason = signal<string>('');
  protected readonly rejectSubmitAttempted = signal<boolean>(false);
  protected readonly rejectFormLoading = signal<boolean>(false);
  protected readonly rejectFormError = signal<string | null>(null);
  protected readonly rejectFormValid = computed(() => this.rejectReason().trim() !== '');

  ngOnInit(): void {
    this.loadPage(0);
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    const status = this.filterStatus() || undefined;

    this.claimApi.search(page, 10, undefined, status).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudieron cargar los reclamos.'));
        this.loading.set(false);
      },
    });
  }

  onFilterStatusChange(event: Event): void {
    this.filterStatus.set((event.target as HTMLSelectElement).value as ClaimStatus | '');
    this.loadPage(0);
  }

  private currentPage(): number {
    return this.data()?.number ?? 0;
  }

  accept(claim: Claim): void {
    if (!claim.id) {
      return;
    }
    this.processingId.set(claim.id);
    this.actionError.set(null);

    this.claimApi.accept(claim.id).subscribe({
      next: () => {
        this.processingId.set(null);
        this.loadPage(this.currentPage());
      },
      error: (err) => {
        this.processingId.set(null);
        this.actionError.set(extractApiErrorMessage(err, 'No se pudo aceptar el reclamo.'));
      },
    });
  }

  markAsPaid(claim: Claim): void {
    if (!claim.id) {
      return;
    }
    this.processingId.set(claim.id);
    this.actionError.set(null);

    this.claimApi.markAsPaid(claim.id).subscribe({
      next: () => {
        this.processingId.set(null);
        this.loadPage(this.currentPage());
      },
      error: (err) => {
        this.processingId.set(null);
        this.actionError.set(extractApiErrorMessage(err, 'No se pudo marcar el reclamo como pagado.'));
      },
    });
  }

  openRejectModal(claim: Claim): void {
    this.rejectingClaim.set(claim);
    this.rejectReason.set('');
    this.rejectSubmitAttempted.set(false);
    this.rejectFormError.set(null);
    this.isRejectModalOpen.set(true);
  }

  closeRejectModal(): void {
    this.isRejectModalOpen.set(false);
    this.rejectingClaim.set(null);
  }

  onRejectReasonInput(event: Event): void {
    this.rejectReason.set((event.target as HTMLTextAreaElement).value);
  }

  onSubmitReject(): void {
    this.rejectSubmitAttempted.set(true);
    if (!this.rejectFormValid()) {
      return;
    }
    const claim = this.rejectingClaim();
    if (!claim?.id) {
      return;
    }

    this.rejectFormLoading.set(true);
    this.rejectFormError.set(null);

    this.claimApi.reject(claim.id, this.rejectReason().trim()).subscribe({
      next: () => {
        this.rejectFormLoading.set(false);
        this.closeRejectModal();
        this.loadPage(this.currentPage());
      },
      error: (err) => {
        this.rejectFormLoading.set(false);
        this.rejectFormError.set(extractApiErrorMessage(err, 'No se pudo rechazar el reclamo.'));
      },
    });
  }
}
