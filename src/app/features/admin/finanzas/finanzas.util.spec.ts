import { describe, expect, it } from 'vitest';

import { formatIsoDateTimeEs, formatMoney, sumPaymentAmounts } from './finanzas.util';

describe('formatMoney', () => {
  // Uses Intl.NumberFormat with an EXPLICIT locale ('es-EC'), never Angular's
  // CurrencyPipe/DecimalPipe (which read LOCALE_ID from DI — es-EC in prod,
  // en-US in a test without the provider, same divergence risk `DatePipe` has
  // — see metrics-shared/turn-status.util.ts). Asserting the real es-EC output
  // (comma decimal, period thousands) proves this path is locale-stable.
  it('formats a plain amount with the es-EC currency format', () => {
    expect(formatMoney(137.5)).toBe('$137,50');
  });

  it('formats a value with thousands separator', () => {
    expect(formatMoney(1234.5)).toBe('$1.234,50');
  });

  // A REAL zero balance (invoice fully paid) must render as an explicit
  // currency zero, not blank or a dash — distinguishing "paid off" from
  // "no data".
  it('renders a real zero as an explicit currency amount', () => {
    expect(formatMoney(0)).toBe('$0,00');
  });

  it('treats null/undefined defensively as zero rather than throwing', () => {
    expect(formatMoney(null)).toBe('$0,00');
    expect(formatMoney(undefined)).toBe('$0,00');
  });

  it('accepts a numeric string (defensive, in case a field arrives unparsed)', () => {
    expect(formatMoney('80')).toBe('$80,00');
  });
});

describe('formatIsoDateTimeEs', () => {
  // Pure string splitting — same discipline as formatIsoDateEs: never
  // `new Date(...)`, so there is no UTC-midnight/timezone roll risk.
  it('formats an OffsetDateTime string as "day month HH:mm"', () => {
    expect(formatIsoDateTimeEs('2026-08-24T14:30:00-05:00')).toBe('24 ago 14:30');
  });

  it('formats a different month/time to prove it is not hardcoded', () => {
    expect(formatIsoDateTimeEs('2026-01-05T09:05:12-05:00')).toBe('5 ene 09:05');
  });

  it('returns a placeholder for a null/undefined timestamp (e.g. an unpaid invoice has no paidAt)', () => {
    expect(formatIsoDateTimeEs(null)).toBe('—');
    expect(formatIsoDateTimeEs(undefined)).toBe('—');
  });
});

describe('sumPaymentAmounts', () => {
  // Deliberately reads the PAYMENTS LIST directly (a plain aggregation of
  // already-fetched data), never `total - balance` — that would be a second,
  // independent derivation of money the server already computed once.
  it('sums the recorded payment amounts', () => {
    expect(sumPaymentAmounts([{ amount: 30 }, { amount: 15.5 }])).toBe(45.5);
  });

  it('returns 0 for a single payment of zero, proving it reads real data and does not just default', () => {
    expect(sumPaymentAmounts([{ amount: 0 }])).toBe(0);
  });

  it('returns 0 for an empty, null or undefined list', () => {
    expect(sumPaymentAmounts([])).toBe(0);
    expect(sumPaymentAmounts(null)).toBe(0);
    expect(sumPaymentAmounts(undefined)).toBe(0);
  });
});
