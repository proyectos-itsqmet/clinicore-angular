import { TestBed } from '@angular/core/testing';

import type { DayTurns } from '../../../core/models';
import { TurnsSeriesChartComponent } from './turns-series-chart.component';

function day(date: string, byStatus: Partial<Record<string, number>> = {}): DayTurns {
  const base = {
    TURN_PENDING: 0,
    TURN_WAITNG: 0,
    TURN_IN_TREATMENT: 0,
    TURN_TREATED: 0,
    TURN_CANCELLED: 0,
    ...byStatus,
  };
  const total = Object.values(base).reduce((sum, value) => sum + (value ?? 0), 0);
  return { date, turns: { byStatus: base as DayTurns['turns']['byStatus'], total } };
}

describe('TurnsSeriesChartComponent', () => {
  function create(days: DayTurns[]) {
    const fixture = TestBed.createComponent(TurnsSeriesChartComponent);
    fixture.componentRef.setInput('days', days);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the empty message and no legend when there are no days', () => {
    const fixture = create([]);

    expect(fixture.nativeElement.textContent).toContain('No hay datos de turnos para graficar');
    expect(fixture.nativeElement.querySelectorAll('svg rect').length).toBe(0);
  });

  it('renders one bar segment per non-zero status per day and labels the range', () => {
    const fixture = create([
      day('2026-08-01', { TURN_PENDING: 2, TURN_TREATED: 3 }),
      day('2026-08-02', { TURN_CANCELLED: 1 }),
    ]);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('1 ago');
    expect(text).toContain('2 ago');

    // Two non-zero segments on day 1 (pending, treated) + one on day 2 (cancelled) = 3 rects.
    expect(fixture.nativeElement.querySelectorAll('svg rect').length).toBe(3);
  });

  it('sums each status across the whole range in the legend, and never relies on colour alone (every entry has a text label)', () => {
    const fixture = create([
      day('2026-08-01', { TURN_PENDING: 2, TURN_TREATED: 3 }),
      day('2026-08-02', { TURN_PENDING: 1, TURN_CANCELLED: 1 }),
    ]);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Pendiente: 3');
    expect(text).toContain('Atendido: 3');
    expect(text).toContain('Cancelado: 1');
    expect(text).toContain('En Espera: 0');
    expect(text).toContain('En Atención: 0');
    expect(text).toContain('Total del rango: 7');
  });

  it('does not divide by zero when every day in range has zero turns', () => {
    const fixture = create([day('2026-08-01'), day('2026-08-02')]);

    expect(fixture.nativeElement.querySelectorAll('svg rect').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Total del rango: 0');
  });
});
