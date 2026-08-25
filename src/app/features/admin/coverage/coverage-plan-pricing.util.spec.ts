import { coveragePlanPricingSummary } from './coverage-plan-pricing.util';

describe('coveragePlanPricingSummary', () => {
  it('describes a percentage-only plan as coinsurance, with no copay', () => {
    expect(coveragePlanPricingSummary({ coveragePercentage: 80, copayAmount: null })).toBe(
      '80% de cobertura por coaseguro (sin copago fijo)',
    );
  });

  it('describes a copay plan and explicitly states the percentage is ignored for billing', () => {
    const summary = coveragePlanPricingSummary({ coveragePercentage: 50, copayAmount: 10 });

    expect(summary).toContain('Copago fijo de $10.00');
    expect(summary).toContain('50%');
    expect(summary).toMatch(/NO se aplica al cobro/);
  });

  it('treats a copayAmount of exactly 0 as "no copay tier" (percentage applies)', () => {
    expect(coveragePlanPricingSummary({ coveragePercentage: 80, copayAmount: 0 })).toBe(
      '80% de cobertura por coaseguro (sin copago fijo)',
    );
  });

  it('treats undefined copayAmount the same as null', () => {
    expect(coveragePlanPricingSummary({ coveragePercentage: 80, copayAmount: undefined })).toBe(
      '80% de cobertura por coaseguro (sin copago fijo)',
    );
  });
});
