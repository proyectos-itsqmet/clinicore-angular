import {
  TURN_STATUS_BADGE_CLASS,
  TURN_STATUS_BAR_COLOR,
  TURN_STATUS_LABELS,
  TURN_STATUS_ORDER,
  extractApiErrorMessage,
  formatIsoDateEs,
  formatRatePercent,
  isPermissionDeniedError,
} from './turn-status.util';

describe('turn-status.util', () => {
  it('declares every TurnStatus exactly once, with a label, badge class and bar color for each', () => {
    expect(TURN_STATUS_ORDER.length).toBe(5);

    for (const status of TURN_STATUS_ORDER) {
      expect(TURN_STATUS_LABELS[status]).toBeTruthy();
      expect(TURN_STATUS_BADGE_CLASS[status]).toBeTruthy();
      expect(TURN_STATUS_BAR_COLOR[status]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  describe('formatIsoDateEs', () => {
    it('formats an ISO date as "day monthAbbrev" in Spanish', () => {
      expect(formatIsoDateEs('2026-08-24')).toBe('24 ago');
      expect(formatIsoDateEs('2026-01-01')).toBe('1 ene');
      expect(formatIsoDateEs('2026-12-31')).toBe('31 dic');
    });

    it('never rolls the day back due to UTC parsing (no `new Date()` involved)', () => {
      // A naive `new Date('2026-08-01')` read back with local getters in a
      // UTC-5 zone (Ecuador) would report day 31 of the previous month.
      expect(formatIsoDateEs('2026-08-01')).toBe('1 ago');
    });
  });

  describe('formatRatePercent', () => {
    it('formats a raw ratio as a one-decimal percentage when a denominator exists', () => {
      expect(formatRatePercent(0.4, true, 'Sin datos')).toBe('40.0%');
      expect(formatRatePercent(1, true, 'Sin datos')).toBe('100.0%');
      expect(formatRatePercent(0, true, 'Sin datos')).toBe('0.0%');
    });

    it('returns the caller label instead of "0.0%" when there was no denominator', () => {
      expect(formatRatePercent(0, false, 'Sin cupos')).toBe('Sin cupos');
    });
  });

  describe('extractApiErrorMessage', () => {
    it('reads the `message` key used by GlobalExceptionHandler (MetricsController)', () => {
      const err = { error: { message: "La fecha 'desde' no puede ser posterior a la fecha 'hasta'" } };
      expect(extractApiErrorMessage(err, 'fallback')).toBe("La fecha 'desde' no puede ser posterior a la fecha 'hasta'");
    });

    it('reads the `error` key used by TurnController/ScheduleController', () => {
      const err = { error: { error: 'Turno no encontrado' } };
      expect(extractApiErrorMessage(err, 'fallback')).toBe('Turno no encontrado');
    });

    it('prefers `message` over `error` when a response somehow has both', () => {
      const err = { error: { message: 'mensaje', error: 'error' } };
      expect(extractApiErrorMessage(err, 'fallback')).toBe('mensaje');
    });

    it('falls back to the caller-supplied message for a network failure with no body', () => {
      expect(extractApiErrorMessage(new ProgressEvent('network error'), 'No se pudo conectar.')).toBe('No se pudo conectar.');
      expect(extractApiErrorMessage(undefined, 'No se pudo conectar.')).toBe('No se pudo conectar.');
    });
  });

  describe('isPermissionDeniedError', () => {
    it('matches a plain-400 ClinicalAccessGuard message even without a 403 status', () => {
      const err = { status: 400 };
      expect(isPermissionDeniedError(err, 'Error de permisos: no tienes acceso a esta historia clínica')).toBe(true);
    });

    it('matches a real 403 status regardless of message content', () => {
      const err = { status: 403 };
      expect(isPermissionDeniedError(err, 'Access Denied')).toBe(true);
    });

    it('does not match an unrelated business error', () => {
      const err = { status: 400 };
      expect(isPermissionDeniedError(err, 'Ya existe una historia clínica para este turno')).toBe(false);
    });
  });
});
