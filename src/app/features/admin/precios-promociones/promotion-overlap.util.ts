import type { Promotion } from '../../../core/models';

/**
 * Backend rejection wording from `PromotionService#rejectIfOverlapping`
 * (Backend_QMS) — it does NOT itself name which promotion conflicts. Kept as
 * a distinct, testable check so the component can decide when it is worth
 * doing the extra lookup in {@link findOverlappingPromotion}.
 */
export function isOverlapConflictError(message: string): boolean {
  return /promoci[oó]n vigente/i.test(message);
}

/**
 * Finds which ALREADY-FETCHED `Promotion` (if any) overlaps a candidate
 * `[startDate, endDate]` window for the same `servicio`, mirroring
 * `PromotionRepository#existsOverlapping`'s interval-overlap test exactly:
 * two inclusive ranges `[s1,e1]` and `[s2,e2]` overlap iff `s1 <= e2 AND
 * s2 <= e1`.
 *
 * Pure ISO `YYYY-MM-DD` STRING comparison throughout: zero-padded ISO dates
 * sort identically to chronological order under plain `<=`, so this never
 * constructs a `Date` from a bare ISO string.
 *
 * `excludeId` mirrors the backend's own "exclude myself" semantics on
 * update: pass the promotion currently being edited (or `null` on create).
 */
export function findOverlappingPromotion(
  existing: readonly Promotion[],
  startDate: string,
  endDate: string,
  excludeId: number | null,
): Promotion | null {
  return (
    existing.find((candidate) => {
      if (excludeId != null && candidate.id === excludeId) return false;
      return candidate.startDate <= endDate && startDate <= candidate.endDate;
    }) ?? null
  );
}
