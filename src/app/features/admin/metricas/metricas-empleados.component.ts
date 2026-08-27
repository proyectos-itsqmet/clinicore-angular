import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MetricsApiService } from '../../../core/api/metrics-api.service';
import type { DoctorMetrics, EmployeesMetrics, OperatorMetrics } from '../../../core/models';
import { extractApiErrorMessage } from '../metrics-shared/turn-status.util';

/** Local palette for this screen's comparison bars — not `TurnStatus`-keyed, so it stays outside `turn-status.util`. */
const ATTENDED_COLOR = '#10b981';
const CANCELLED_COLOR = '#f43f5e';
const NO_SHOW_COLOR = '#94a3b8';
const HANDLED_COLOR = '#3b82f6';

interface BarSegment {
  label: string;
  value: number;
  color: string;
  widthPercent: number;
}

interface DoctorRow extends DoctorMetrics {
  /** Sum of the three fields this DTO actually reports — NOT every turn ever assigned to the doctor (see `DoctorMetricsDTO`). */
  trackedTotal: number;
  segments: BarSegment[];
}

interface OperatorRow extends OperatorMetrics {
  segments: BarSegment[];
}

/**
 * app-metricas-empleados — "Métricas > Empleados": `GET
 * /api/metrics/employees`. Two tables (doctors, operators), each row with a
 * 100%-stacked comparison bar over the fields that DTO actually reports —
 * for doctors that's attended/cancelled/no-shows, NOT every turn ever
 * assigned to them (`DoctorMetricsDTO` has no "pending/in-treatment" count).
 */
@Component({
  selector: 'app-metricas-empleados',
  imports: [FormsModule],
  templateUrl: './metricas-empleados.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricasEmpleadosComponent implements OnInit {
  private readonly api = inject(MetricsApiService);

  protected readonly rangeFrom = signal<string>('');
  protected readonly rangeTo = signal<string>('');

  protected readonly data = signal<EmployeesMetrics | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly doctorRows = computed<DoctorRow[]>(() => {
    const doctors = this.data()?.doctors ?? [];
    return doctors.map((doctor) => {
      const trackedTotal = doctor.attended + doctor.cancelled + doctor.noShows;
      const denominator = trackedTotal || 1;
      return {
        ...doctor,
        trackedTotal,
        segments: [
          { label: 'Atendidos', value: doctor.attended, color: ATTENDED_COLOR, widthPercent: (doctor.attended / denominator) * 100 },
          { label: 'Cancelados', value: doctor.cancelled, color: CANCELLED_COLOR, widthPercent: (doctor.cancelled / denominator) * 100 },
          { label: 'Inasistencias', value: doctor.noShows, color: NO_SHOW_COLOR, widthPercent: (doctor.noShows / denominator) * 100 },
        ],
      };
    });
  });

  protected readonly operatorRows = computed<OperatorRow[]>(() => {
    const operators = this.data()?.operators ?? [];
    return operators.map((operator) => {
      const denominator = operator.turnsHandled || 1;
      const rest = Math.max(0, operator.turnsHandled - operator.cancelled);
      return {
        ...operator,
        segments: [
          { label: 'Cancelados', value: operator.cancelled, color: CANCELLED_COLOR, widthPercent: (operator.cancelled / denominator) * 100 },
          { label: 'Resto', value: rest, color: HANDLED_COLOR, widthPercent: (rest / denominator) * 100 },
        ],
      };
    });
  });

  // ==========================================================================
  // Cifras del equipo completo, derivadas de las mismas dos tablas.
  // ==========================================================================

  protected readonly totalAttended = computed(() =>
    this.doctorRows().reduce((sum, d) => sum + d.attended, 0),
  );

  protected readonly totalNoShows = computed(() =>
    this.doctorRows().reduce((sum, d) => sum + d.noShows, 0),
  );

  protected readonly totalCancelled = computed(() =>
    this.doctorRows().reduce((sum, d) => sum + d.cancelled, 0),
  );

  /** Base de todos los porcentajes: solo lo que este DTO realmente reporta. */
  private readonly trackedTotal = computed(() =>
    this.totalAttended() + this.totalCancelled() + this.totalNoShows(),
  );

  /**
   * Inasistencias sobre el total seguido, en porcentaje.
   *
   * Es la cifra que más cuesta ver en la tabla y la que más plata mueve: una
   * inasistencia es un cupo que no se puede revender porque nadie avisó.
   * Distinta de una cancelación, que al menos libera el horario.
   */
  protected readonly noShowRate = computed(() => {
    const total = this.trackedTotal();
    return total === 0 ? 0 : Math.round((this.totalNoShows() / total) * 1000) / 10;
  });

  protected readonly attendedRate = computed(() => {
    const total = this.trackedTotal();
    return total === 0 ? 0 : Math.round((this.totalAttended() / total) * 1000) / 10;
  });

  protected readonly hasTrackedTurns = computed(() => this.trackedTotal() > 0);

  /**
   * Los doctores con más inasistencias, no con peor proporción.
   *
   * A propósito: una proporción castiga a quien tiene pocos turnos — un
   * médico con 1 atendido y 1 inasistencia da 50% y no es el problema. Lo que
   * duele en la agenda es el volumen absoluto de cupos perdidos.
   */
  protected readonly topNoShowDoctors = computed(() =>
    this.doctorRows()
      .filter((d) => d.noShows > 0)
      .sort((a, b) => b.noShows - a.noShows)
      .slice(0, 3),
  );

  protected readonly totalTurnsHandled = computed(() =>
    this.operatorRows().reduce((sum, o) => sum + o.turnsHandled, 0),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getEmployeesMetrics({ from: this.rangeFrom() || undefined, to: this.rangeTo() || undefined }).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudieron cargar las métricas de empleados.'));
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
