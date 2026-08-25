import type { CoveragePlan } from '../../../core/models';

/**
 * Permanent guidance shown at the plan create/edit form (`coverage-list.component`)
 * and wherever a plan is picked for a patient (`patient-detail.component`'s
 * "Asignar cobertura" modal) — at the point of entry, not a tooltip nobody opens.
 *
 * `coveragePercentage` and `copayAmount` are MUTUALLY EXCLUSIVE for BILLING:
 * see `CoveragePricingService` (Backend_QMS). A plan with a `copayAmount` set
 * charges the patient exactly that amount; `coveragePercentage` is only
 * echoed back for transparency and never applied to the charge.
 */
export const COVERAGE_PLAN_PRICING_HINT =
  'El copago fijo y el porcentaje de cobertura son EXCLUYENTES para el cobro: si defines un copago, el paciente paga exactamente ese monto y el porcentaje de cobertura se ignora al facturar (queda guardado solo de forma informativa). Si dejas el copago vacío, se aplica el porcentaje de cobertura.';

/**
 * Describes which lever a SPECIFIC plan actually uses at checkout right now,
 * given its current `coveragePercentage`/`copayAmount`. One function, reused
 * by every screen that shows a plan, so the wording can never drift between
 * the plan form, the plans table and the patient-coverage assignment modal.
 */
export function coveragePlanPricingSummary(plan: Pick<CoveragePlan, 'coveragePercentage' | 'copayAmount'>): string {
  const copay = plan.copayAmount != null ? Number(plan.copayAmount) : null;
  if (copay != null && copay > 0) {
    return `Copago fijo de $${copay.toFixed(2)} (el ${plan.coveragePercentage}% de cobertura NO se aplica al cobro)`;
  }
  return `${plan.coveragePercentage}% de cobertura por coaseguro (sin copago fijo)`;
}
