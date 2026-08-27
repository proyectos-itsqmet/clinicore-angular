import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MetricsApiService } from '../../../core/api/metrics-api.service';
import type { PatientsMetrics } from '../../../core/models';
import { extractApiErrorMessage, formatRatePercent } from '../metrics-shared/turn-status.util';

/**
 * app-metricas-pacientes — "Métricas > Pacientes": `GET
 * /api/metrics/patients`. Always resolves to one object (never a list), so
 * "empty" here means "no patient activity in the period" — an inline note
 * next to the (still meaningful, still real) zero-valued cards, not a
 * full-page empty state replacing them.
 */
@Component({
  selector: 'app-metricas-pacientes',
  imports: [FormsModule],
  templateUrl: './metricas-pacientes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricasPacientesComponent implements OnInit {
  private readonly api = inject(MetricsApiService);

  protected readonly rangeFrom = signal<string>('');
  protected readonly rangeTo = signal<string>('');

  protected readonly data = signal<PatientsMetrics | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly hasTurnsInPeriod = computed(() => (this.data()?.turnsInPeriod ?? 0) > 0);

  // ==========================================================================
  // Lecturas derivadas.
  //
  // `PatientsMetrics` trae CUATRO números y esta pantalla ya los mostraba los
  // cuatro: no hay más dato que traer de ese endpoint. Lo que faltaba era
  // convertirlos en las preguntas que un gerente hace de verdad — cuántos
  // turnos se sostuvieron, y cuántos trae cada paciente nuevo.
  // ==========================================================================

  /** Turnos que NO se cancelaron. La cifra que sostiene la operación. */
  protected readonly effectiveTurns = computed(() => {
    const data = this.data();
    if (!data) return 0;
    return Math.max(0, data.turnsInPeriod - data.cancelledInPeriod);
  });

  protected readonly effectivePercent = computed(() => {
    const data = this.data();
    if (!data || data.turnsInPeriod === 0) return 0;
    return (this.effectiveTurns() / data.turnsInPeriod) * 100;
  });

  /**
   * Turnos por paciente nuevo del período.
   *
   * NO es "turnos por paciente": el denominador son solo los pacientes
   * NUEVOS, y el numerador incluye turnos de pacientes que ya existían. Es un
   * indicador de mezcla, no un promedio por persona — sirve para ver si el
   * período se sostuvo con gente nueva o con la cartera de siempre, y la
   * pantalla lo dice con esas palabras para que nadie lo lea como otra cosa.
   */
  protected readonly turnsPerNewPatient = computed(() => {
    const data = this.data();
    if (!data || data.newPatients === 0) return null;
    return Math.round((data.turnsInPeriod / data.newPatients) * 10) / 10;
  });

  protected readonly cancellationLabel = computed(() => {
    const data = this.data();
    if (!data) {
      return '';
    }
    return formatRatePercent(data.cancellationRate, data.turnsInPeriod > 0, 'Sin turnos en el período');
  });

  protected readonly cancellationPercent = computed(() => {
    const data = this.data();
    return data && data.turnsInPeriod > 0 ? data.cancellationRate * 100 : 0;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getPatientsMetrics({ from: this.rangeFrom() || undefined, to: this.rangeTo() || undefined }).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudieron cargar las métricas de pacientes.'));
        this.loading.set(false);
      },
    });
  }

  onRangeFromChange(value: string): void {
    this.rangeFrom.set(value);
    this.load();
  }

  onRangeToChange(value: string): void {
    this.rangeTo.set(value);
    this.load();
  }
}
