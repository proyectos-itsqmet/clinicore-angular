import type { Promotion } from '../../../core/models';
import { findOverlappingPromotion, isOverlapConflictError } from './promotion-overlap.util';

function servicio(id: number) {
  return { id, name: `Servicio ${id}`, price: 100 };
}

function promo(id: number, overrides: Partial<Promotion> = {}): Promotion {
  return {
    id,
    servicio: servicio(1),
    name: `Promo ${id}`,
    discountType: 'PERCENTAGE',
    discountValue: 10,
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    ...overrides,
  };
}

describe('isOverlapConflictError', () => {
  it('matches the exact PromotionService#rejectIfOverlapping wording', () => {
    expect(
      isOverlapConflictError(
        'Ya existe una promoción vigente para este servicio en ese rango de fechas. Ajuste las fechas o finalice la promoción existente antes de crear esta.',
      ),
    ).toBe(true);
  });

  it('does not match unrelated backend messages', () => {
    expect(isOverlapConflictError('El servicio es obligatorio')).toBe(false);
    expect(isOverlapConflictError('Ocurrió un error interno en el servidor')).toBe(false);
  });
});

describe('findOverlappingPromotion', () => {
  it('finds a promotion whose range overlaps the candidate window', () => {
    const existing = [promo(1, { startDate: '2026-08-01', endDate: '2026-08-31' })];
    const match = findOverlappingPromotion(existing, '2026-08-15', '2026-09-15', null);
    expect(match?.id).toBe(1);
  });

  it('returns null when no existing promotion overlaps', () => {
    const existing = [promo(1, { startDate: '2026-08-01', endDate: '2026-08-31' })];
    const match = findOverlappingPromotion(existing, '2026-09-01', '2026-09-30', null);
    expect(match).toBeNull();
  });

  it('treats date boundaries as inclusive, mirroring the backend interval test', () => {
    const existing = [promo(1, { startDate: '2026-08-01', endDate: '2026-08-31' })];
    expect(findOverlappingPromotion(existing, '2026-07-01', '2026-08-01', null)?.id).toBe(1);
    expect(findOverlappingPromotion(existing, '2026-08-31', '2026-09-30', null)?.id).toBe(1);
  });

  it('excludes the currently-edited promotion from candidates, mirroring the backend excludeId semantics', () => {
    const existing = [promo(1, { startDate: '2026-08-01', endDate: '2026-08-31' })];
    const match = findOverlappingPromotion(existing, '2026-08-01', '2026-08-31', 1);
    expect(match).toBeNull();
  });

  it('picks the correct one among several unrelated promotions', () => {
    const existing = [
      promo(1, { name: 'Enero', startDate: '2026-01-01', endDate: '2026-01-31' }),
      promo(2, { name: 'Agosto', startDate: '2026-08-01', endDate: '2026-08-31' }),
    ];
    const match = findOverlappingPromotion(existing, '2026-08-10', '2026-08-20', null);
    expect(match?.name).toBe('Agosto');
  });
});
