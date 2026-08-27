import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { SelectField, type SelectOption } from '../../../shared/ui/molecules/select-field/select-field';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { InvoiceApiService } from '../../../core/api/invoice-api.service';
import { PatientApiService } from '../../../core/api/patient-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import type { Invoice, InvoiceCreate, InvoiceLineItemCreate, InvoiceLineSourceType, InvoiceStatus, Page, Patient } from '../../../core/models';
import { extractApiErrorMessage } from '../metrics-shared/turn-status.util';
import { INVOICE_LINE_SOURCE_LABELS, INVOICE_STATUS_BADGE_CLASS, INVOICE_STATUS_LABELS, formatIsoDateTimeEs, formatMoney } from './finanzas.util';

interface LineItemForm {
  sourceType: InvoiceLineSourceType;
  sourceId: string;
  description: string;
  amount: string;
}

function blankLine(): LineItemForm {
  return { sourceType: 'FREE_LINE', sourceId: '', description: '', amount: '' };
}

/**
 * app-facturacion-list — "Finanzas > Facturación"
 * (`GET/POST /api/invoices`). Lists issued invoices with a status filter and
 * a create form; every money figure rendered here comes straight from
 * `InvoiceDTO` — this screen never recomputes a total from a service's
 * current price. There is deliberately no delete affordance: an Invoice is
 * VOIDED (ROLE_ADMIN, reason required) from the detail page, never deleted.
 */
@Component({
  selector: 'app-facturacion-list',
  imports: [FormsModule, RouterLink, SelectField],
  templateUrl: './facturacion-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacturacionListComponent implements OnInit {
  private readonly invoiceApi = inject(InvoiceApiService);
  private readonly patientApi = inject(PatientApiService);
  private readonly authService = inject(AuthService);

  protected readonly formatMoney = formatMoney;
  protected readonly formatIsoDateTimeEs = formatIsoDateTimeEs;
  protected readonly INVOICE_STATUS_LABELS = INVOICE_STATUS_LABELS;
  protected readonly INVOICE_STATUS_BADGE_CLASS = INVOICE_STATUS_BADGE_CLASS;
  protected readonly INVOICE_LINE_SOURCE_LABELS = INVOICE_LINE_SOURCE_LABELS;

  protected readonly data = signal<Page<Invoice> | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filterStatus = signal<InvoiceStatus | ''>('');

  // --- Modal: crear factura ---
  protected readonly isCreateModalOpen = signal<boolean>(false);
  protected readonly formLoading = signal<boolean>(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly createSubmitAttempted = signal<boolean>(false);

  protected readonly patientSearchName = signal<string>('');
  protected readonly patientSearchCi = signal<string>('');
  protected readonly patientSearchLoading = signal<boolean>(false);
  protected readonly patientSearchAttempted = signal<boolean>(false);
  protected readonly patientSearchError = signal<string | null>(null);
  protected readonly patientResults = signal<Patient[]>([]);
  protected readonly selectedPatient = signal<Patient | null>(null);

  protected readonly lineItems = signal<LineItemForm[]>([blankLine()]);

  protected readonly lineItemsValid = computed(() =>
    this.lineItems().every((line) => {
      if (line.sourceType === 'FREE_LINE') {
        return line.description.trim() !== '' && Number(line.amount) > 0;
      }
      return line.sourceId.trim() !== '' && Number(line.sourceId) > 0;
    }),
  );

  ngOnInit(): void {
    this.loadPage(0);
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    const status = this.filterStatus() || undefined;

    const request$ = this.authService.currentUser()?.role === 'ROLE_DOCTOR' 
      ? this.invoiceApi.getMyInvoices(page, 10) 
      : this.invoiceApi.search(page, 10, undefined, status);

    request$.subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudieron cargar las facturas.'));
        this.loading.set(false);
      },
    });
  }

  protected readonly INVOICE_STATUS_FILTER_OPTIONS: readonly SelectOption[] = [
    { value: '', label: 'Todos' },
    { value: 'ISSUED', label: 'Emitida' },
    { value: 'PARTIALLY_PAID', label: 'Pago parcial' },
    { value: 'PAID', label: 'Pagada' },
    { value: 'VOID', label: 'Anulada' },
  ];

  /** Los cuatro origenes posibles de una linea de factura. */
  protected readonly LINE_SOURCE_OPTIONS: readonly SelectOption[] = [
    { value: 'FREE_LINE', label: INVOICE_LINE_SOURCE_LABELS.FREE_LINE },
    { value: 'TURN', label: INVOICE_LINE_SOURCE_LABELS.TURN },
    { value: 'PACKAGE', label: INVOICE_LINE_SOURCE_LABELS.PACKAGE },
    { value: 'SESSION_PLAN', label: INVOICE_LINE_SOURCE_LABELS.SESSION_PLAN },
  ];

  onFilterStatusChange(value: string): void {
    const status = value as InvoiceStatus | "";
    this.filterStatus.set(status);
    this.loadPage(0);
  }

  // --- Modal: abrir/cerrar ---
  openCreateModal(): void {
    this.selectedPatient.set(null);
    this.patientSearchName.set('');
    this.patientSearchCi.set('');
    this.patientResults.set([]);
    this.patientSearchAttempted.set(false);
    this.patientSearchError.set(null);
    this.lineItems.set([blankLine()]);
    this.createSubmitAttempted.set(false);
    this.formError.set(null);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  // --- Búsqueda de paciente ---
  onPatientSearchNameInput(event: Event): void {
    this.patientSearchName.set((event.target as HTMLInputElement).value);
  }

  onPatientSearchCiInput(event: Event): void {
    this.patientSearchCi.set((event.target as HTMLInputElement).value);
  }

  searchPatients(): void {
    this.patientSearchAttempted.set(true);
    this.patientSearchLoading.set(true);
    this.patientSearchError.set(null);
    const name = this.patientSearchName().trim() || undefined;
    const ci = this.patientSearchCi().trim() || undefined;

    this.patientApi.getAll(name, ci, 0, 5).subscribe({
      next: (result) => {
        this.patientResults.set(result.content);
        this.patientSearchLoading.set(false);
      },
      error: (err) => {
        this.patientResults.set([]);
        this.patientSearchLoading.set(false);
        this.patientSearchError.set(extractApiErrorMessage(err, 'No se pudo buscar pacientes.'));
      },
    });
  }

  selectPatient(patient: Patient): void {
    this.selectedPatient.set(patient);
    this.patientResults.set([]);
  }

  clearSelectedPatient(): void {
    this.selectedPatient.set(null);
    this.patientSearchName.set('');
    this.patientSearchCi.set('');
    this.patientSearchAttempted.set(false);
  }

  // --- Líneas de factura ---
  addLineItem(): void {
    this.lineItems.update((items) => [...items, blankLine()]);
  }

  removeLineItem(index: number): void {
    this.lineItems.update((items) => items.filter((_, i) => i !== index));
  }

  onLineSourceTypeChange(index: number, raw: string): void {
    const value = raw as InvoiceLineSourceType;
    this.lineItems.update((items) => items.map((item, i) => (i === index ? { ...item, sourceType: value } : item)));
  }

  onLineDescriptionInput(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.lineItems.update((items) => items.map((item, i) => (i === index ? { ...item, description: value } : item)));
  }

  onLineAmountInput(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.lineItems.update((items) => items.map((item, i) => (i === index ? { ...item, amount: value } : item)));
  }

  onLineSourceIdInput(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.lineItems.update((items) => items.map((item, i) => (i === index ? { ...item, sourceId: value } : item)));
  }

  private toLineItemCreate(line: LineItemForm): InvoiceLineItemCreate {
    if (line.sourceType === 'FREE_LINE') {
      return { sourceType: 'FREE_LINE', description: line.description.trim(), amount: Number(line.amount) };
    }
    return { sourceType: line.sourceType, sourceId: Number(line.sourceId) };
  }

  onSubmitCreate(): void {
    this.createSubmitAttempted.set(true);
    const patient = this.selectedPatient();
    if (!patient || !this.lineItemsValid()) {
      return;
    }

    const payload: InvoiceCreate = {
      patient: { uuid: patient.uuid },
      items: this.lineItems().map((line) => this.toLineItemCreate(line)),
    };

    this.formLoading.set(true);
    this.formError.set(null);

    this.invoiceApi.create(payload).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeCreateModal();
        this.loadPage(0);
      },
      error: (err) => {
        this.formLoading.set(false);
        this.formError.set(extractApiErrorMessage(err, 'Ocurrió un error al crear la factura.'));
      },
    });
  }
}
