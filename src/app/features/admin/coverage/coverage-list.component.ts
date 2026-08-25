import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CoveragePlanApiService } from '../../../core/api/coverage-plan-api.service';
import { InsurerApiService } from '../../../core/api/insurer-api.service';
import { fetchAllPages } from '../../../core/api/fetch-all-pages.util';
import { extractApiErrorMessage, isPermissionDeniedError } from '../metrics-shared/turn-status.util';
import { COVERAGE_PLAN_PRICING_HINT, coveragePlanPricingSummary } from './coverage-plan-pricing.util';
import type { CoveragePlan, Insurer, InsurerType, Page } from '../../../core/models';

type CoverageTab = 'aseguradoras' | 'planes';

/**
 * app-coverage-list — "Admin > Planes de cobertura"
 * (`GET/POST/PUT/DELETE /api/insurers`, `/api/coverage-plans`).
 *
 * ONE routed destination managing TWO catalog entities (a CoveragePlan
 * belongs to an Insurer), switched by an internal tab: `admin-nav.data.ts`
 * declares `planes-de-cobertura` as a single flat leaf under `administracion`
 * (not a sub-group), so this does not get its own `aseguradoras`/`planes`
 * routes — restructuring that nav array is out of scope here.
 *
 * Deliberately does NOT manage `PatientCoverage` (assigning a policy to ONE
 * patient): that write lives in `patient-detail.component.ts`'s "Coberturas"
 * tab instead, next to every other per-patient administration (turnos). This
 * screen manages what plans EXIST; it has no patient picker and should never
 * grow one — see that component's docblock for the full justification.
 */
@Component({
  selector: 'app-coverage-list',
  imports: [FormsModule],
  templateUrl: './coverage-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoverageListComponent implements OnInit {
  private readonly insurerApi = inject(InsurerApiService);
  private readonly planApi = inject(CoveragePlanApiService);

  protected readonly coveragePlanPricingSummary = coveragePlanPricingSummary;
  protected readonly PRICING_HINT = COVERAGE_PLAN_PRICING_HINT;

  protected readonly activeTab = signal<CoverageTab>('aseguradoras');

  // --- Aseguradoras: listado ---
  protected readonly insurersData = signal<Page<Insurer> | null>(null);
  protected readonly insurersLoading = signal<boolean>(true);
  protected readonly insurersError = signal<string | null>(null);

  // --- Aseguradoras: modal crear/editar ---
  protected readonly isInsurerModalOpen = signal<boolean>(false);
  protected readonly editingInsurer = signal<Insurer | null>(null);
  protected readonly insurerFormLoading = signal<boolean>(false);
  protected readonly insurerFormError = signal<string | null>(null);
  protected readonly insurerSubmitAttempted = signal<boolean>(false);

  protected readonly insurerFormName = signal<string>('');
  protected readonly insurerFormType = signal<InsurerType | ''>('');

  protected readonly insurerFormValid = computed(() => !!this.insurerFormName().trim() && !!this.insurerFormType());

  // --- Aseguradoras: modal eliminar ---
  protected readonly isInsurerDeleteModalOpen = signal<boolean>(false);
  protected readonly deletingInsurer = signal<Insurer | null>(null);

  // Catálogo completo (todas las páginas) para el <select> del formulario de Planes y su filtro.
  protected readonly insurersCatalog = signal<Insurer[]>([]);
  protected readonly insurersCatalogLoading = signal<boolean>(false);
  protected readonly insurersCatalogError = signal<string | null>(null);
  protected readonly insurersCatalogIncomplete = signal<boolean>(false);

  // --- Planes de Cobertura: listado ---
  protected readonly plansData = signal<Page<CoveragePlan> | null>(null);
  protected readonly plansLoading = signal<boolean>(true);
  protected readonly plansError = signal<string | null>(null);
  protected readonly plansFilterInsurerId = signal<number | null>(null);

  // --- Planes de Cobertura: modal crear/editar ---
  protected readonly isPlanModalOpen = signal<boolean>(false);
  protected readonly editingPlan = signal<CoveragePlan | null>(null);
  protected readonly planFormLoading = signal<boolean>(false);
  protected readonly planFormError = signal<string | null>(null);
  protected readonly planSubmitAttempted = signal<boolean>(false);

  protected readonly planFormInsurerId = signal<number | null>(null);
  protected readonly planFormName = signal<string>('');
  protected readonly planFormCoveragePercentage = signal<string>('0');
  protected readonly planFormCopayAmount = signal<string>('');

  protected readonly planFormValid = computed(() => {
    const pct = Number(this.planFormCoveragePercentage());
    return (
      this.planFormInsurerId() != null &&
      !!this.planFormName().trim() &&
      this.planFormCoveragePercentage().trim() !== '' &&
      Number.isFinite(pct) &&
      pct >= 0 &&
      pct <= 100
    );
  });

  /** Live preview of which pricing lever the DRAFT plan would use — shown next to the fields, not only after saving. */
  protected readonly planFormPricingPreview = computed(() => {
    const pct = Number(this.planFormCoveragePercentage() || 0);
    const copayRaw = this.planFormCopayAmount().trim();
    const copay = copayRaw === '' ? null : Number(copayRaw);
    return coveragePlanPricingSummary({ coveragePercentage: Number.isFinite(pct) ? pct : 0, copayAmount: copay });
  });

  // --- Planes de Cobertura: modal eliminar ---
  protected readonly isPlanDeleteModalOpen = signal<boolean>(false);
  protected readonly deletingPlan = signal<CoveragePlan | null>(null);

  ngOnInit(): void {
    this.loadInsurersCatalog();
    this.loadInsurers(0);
    this.loadPlans(0);
  }

  selectTab(tab: CoverageTab): void {
    this.activeTab.set(tab);
  }

  private loadInsurersCatalog(): void {
    this.insurersCatalogLoading.set(true);
    this.insurersCatalogError.set(null);
    fetchAllPages((page) => this.insurerApi.getAll(page, 100)).subscribe({
      next: ({ items, complete }) => {
        this.insurersCatalog.set(items);
        this.insurersCatalogIncomplete.set(!complete);
        this.insurersCatalogLoading.set(false);
      },
      error: (err) => {
        this.insurersCatalogError.set(extractApiErrorMessage(err, 'No se pudo cargar el catálogo de aseguradoras.'));
        this.insurersCatalogLoading.set(false);
      },
    });
  }

  protected insurerName(id: number): string {
    return this.insurersCatalog().find((i) => i.id === id)?.name ?? `Aseguradora #${id}`;
  }

  protected insurerTypeLabel(type: InsurerType): string {
    return type === 'INSURER_PUBLIC' ? 'Pública' : 'Privada';
  }

  protected insurerTypeBadgeClass(type: InsurerType): string {
    return type === 'INSURER_PUBLIC'
      ? 'bg-purple-50 text-purple-700 border border-purple-200'
      : 'bg-blue-50 text-blue-700 border border-blue-200';
  }

  /** Wraps `extractApiErrorMessage` with a clearer explanation for the one denial this ROLE_ADMIN-only screen can realistically hit: an authenticated non-admin (e.g. ROLE_EMPLOYEE) attempting a write. */
  private describeWriteError(err: unknown, fallback: string): string {
    const message = extractApiErrorMessage(err, fallback);
    if (isPermissionDeniedError(err, message)) {
      return 'No tienes permisos para esta acción: solo un Administrador puede crear, editar o eliminar aseguradoras y planes de cobertura.';
    }
    return message;
  }

  // --- Aseguradoras: listado ---
  loadInsurers(page: number): void {
    this.insurersLoading.set(true);
    this.insurersError.set(null);

    this.insurerApi.getAll(page, 10).subscribe({
      next: (pageData) => {
        this.insurersData.set(pageData);
        this.insurersLoading.set(false);
      },
      error: (err) => {
        this.insurersError.set(extractApiErrorMessage(err, 'No se pudieron cargar las aseguradoras.'));
        this.insurersLoading.set(false);
      },
    });
  }

  // --- Aseguradoras: crear/editar ---
  openCreateInsurerModal(): void {
    this.editingInsurer.set(null);
    this.insurerFormName.set('');
    this.insurerFormType.set('');
    this.insurerFormError.set(null);
    this.insurerSubmitAttempted.set(false);
    this.isInsurerModalOpen.set(true);
  }

  openEditInsurerModal(item: Insurer): void {
    this.editingInsurer.set(item);
    this.insurerFormName.set(item.name);
    this.insurerFormType.set(item.type);
    this.insurerFormError.set(null);
    this.insurerSubmitAttempted.set(false);
    this.isInsurerModalOpen.set(true);
  }

  closeInsurerModal(): void {
    this.isInsurerModalOpen.set(false);
    this.editingInsurer.set(null);
  }

  onInsurerNameInput(event: Event): void {
    this.insurerFormName.set((event.target as HTMLInputElement).value);
  }

  onInsurerTypeChange(event: Event): void {
    this.insurerFormType.set((event.target as HTMLSelectElement).value as InsurerType | '');
  }

  onInsurerFormSubmit(): void {
    this.insurerSubmitAttempted.set(true);
    if (!this.insurerFormValid()) {
      return;
    }

    const type = this.insurerFormType();
    if (!type) return;

    const payload = { name: this.insurerFormName().trim(), type };

    this.insurerFormLoading.set(true);
    this.insurerFormError.set(null);

    const editing = this.editingInsurer();
    const request = editing ? this.insurerApi.update(editing.id, payload) : this.insurerApi.create(payload);

    request.subscribe({
      next: () => {
        this.insurerFormLoading.set(false);
        this.closeInsurerModal();
        this.loadInsurers(this.insurersData()?.number ?? 0);
        this.loadInsurersCatalog();
      },
      error: (err) => {
        this.insurerFormLoading.set(false);
        this.insurerFormError.set(
          this.describeWriteError(err, editing ? 'Ocurrió un error al actualizar la aseguradora.' : 'Ocurrió un error al crear la aseguradora.'),
        );
      },
    });
  }

  // --- Aseguradoras: eliminar ---
  openInsurerDeleteModal(item: Insurer): void {
    this.deletingInsurer.set(item);
    this.insurerFormError.set(null);
    this.isInsurerDeleteModalOpen.set(true);
  }

  closeInsurerDeleteModal(): void {
    this.isInsurerDeleteModalOpen.set(false);
    this.deletingInsurer.set(null);
  }

  confirmDeleteInsurer(): void {
    const item = this.deletingInsurer();
    if (!item) return;

    this.insurerFormLoading.set(true);
    this.insurerFormError.set(null);

    this.insurerApi.delete(item.id).subscribe({
      next: () => {
        this.insurerFormLoading.set(false);
        this.closeInsurerDeleteModal();
        this.loadInsurers(this.insurersData()?.number ?? 0);
        this.loadInsurersCatalog();
      },
      error: (err) => {
        this.insurerFormLoading.set(false);
        // InsurerService#delete refuses (400) with a Spanish message when plans still reference it — surfaced verbatim via describeWriteError/extractApiErrorMessage, never swallowed into a generic message.
        this.insurerFormError.set(this.describeWriteError(err, 'Ocurrió un error al eliminar la aseguradora.'));
      },
    });
  }

  // --- Planes: listado ---
  loadPlans(page: number): void {
    this.plansLoading.set(true);
    this.plansError.set(null);

    this.planApi.getAll(page, 10, this.plansFilterInsurerId() ?? undefined).subscribe({
      next: (pageData) => {
        this.plansData.set(pageData);
        this.plansLoading.set(false);
      },
      error: (err) => {
        this.plansError.set(extractApiErrorMessage(err, 'No se pudieron cargar los planes de cobertura.'));
        this.plansLoading.set(false);
      },
    });
  }

  onPlansFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.plansFilterInsurerId.set(value ? Number(value) : null);
    this.loadPlans(0);
  }

  // --- Planes: crear/editar ---
  openCreatePlanModal(): void {
    this.editingPlan.set(null);
    this.planFormInsurerId.set(this.insurersCatalog()[0]?.id ?? null);
    this.planFormName.set('');
    this.planFormCoveragePercentage.set('0');
    this.planFormCopayAmount.set('');
    this.planFormError.set(null);
    this.planSubmitAttempted.set(false);
    this.isPlanModalOpen.set(true);
  }

  openEditPlanModal(item: CoveragePlan): void {
    this.editingPlan.set(item);
    this.planFormInsurerId.set(item.insurer.id);
    this.planFormName.set(item.name);
    this.planFormCoveragePercentage.set(String(item.coveragePercentage));
    this.planFormCopayAmount.set(item.copayAmount != null ? String(item.copayAmount) : '');
    this.planFormError.set(null);
    this.planSubmitAttempted.set(false);
    this.isPlanModalOpen.set(true);
  }

  closePlanModal(): void {
    this.isPlanModalOpen.set(false);
    this.editingPlan.set(null);
  }

  onPlanInsurerChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.planFormInsurerId.set(value ? Number(value) : null);
  }

  onPlanNameInput(event: Event): void {
    this.planFormName.set((event.target as HTMLInputElement).value);
  }

  onPlanCoveragePercentageInput(event: Event): void {
    this.planFormCoveragePercentage.set((event.target as HTMLInputElement).value);
  }

  onPlanCopayAmountInput(event: Event): void {
    this.planFormCopayAmount.set((event.target as HTMLInputElement).value);
  }

  onPlanFormSubmit(): void {
    this.planSubmitAttempted.set(true);
    if (!this.planFormValid()) {
      return;
    }

    const insurerId = this.planFormInsurerId();
    if (insurerId == null) return;

    const copayRaw = this.planFormCopayAmount().trim();
    const payload = {
      insurer: { id: insurerId },
      name: this.planFormName().trim(),
      coveragePercentage: Number(this.planFormCoveragePercentage()),
      copayAmount: copayRaw === '' ? null : Number(copayRaw),
    };

    this.planFormLoading.set(true);
    this.planFormError.set(null);

    const editing = this.editingPlan();
    const request = editing ? this.planApi.update(editing.id, payload) : this.planApi.create(payload);

    request.subscribe({
      next: () => {
        this.planFormLoading.set(false);
        this.closePlanModal();
        this.loadPlans(this.plansData()?.number ?? 0);
      },
      error: (err) => {
        this.planFormLoading.set(false);
        this.planFormError.set(
          this.describeWriteError(err, editing ? 'Ocurrió un error al actualizar el plan.' : 'Ocurrió un error al crear el plan.'),
        );
      },
    });
  }

  // --- Planes: eliminar ---
  openPlanDeleteModal(item: CoveragePlan): void {
    this.deletingPlan.set(item);
    this.planFormError.set(null);
    this.isPlanDeleteModalOpen.set(true);
  }

  closePlanDeleteModal(): void {
    this.isPlanDeleteModalOpen.set(false);
    this.deletingPlan.set(null);
  }

  confirmDeletePlan(): void {
    const item = this.deletingPlan();
    if (!item) return;

    this.planFormLoading.set(true);
    this.planFormError.set(null);

    this.planApi.delete(item.id).subscribe({
      next: () => {
        this.planFormLoading.set(false);
        this.closePlanDeleteModal();
        this.loadPlans(this.plansData()?.number ?? 0);
      },
      error: (err) => {
        this.planFormLoading.set(false);
        // CoveragePlanService#delete refuses (400) with a Spanish message when patient coverages still reference it — surfaced verbatim.
        this.planFormError.set(this.describeWriteError(err, 'Ocurrió un error al eliminar el plan.'));
      },
    });
  }
}
