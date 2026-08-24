import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { MetricsApiService } from '../../../core/api/metrics-api.service';
import type { MetricGroup, MetricRange, MetricSummary } from '../../../core/models';
import { BarList, type BarListItem } from '../../../shared/ui/molecules/bar-list/bar-list';
import {
  DateRangeFilter,
  type DateRange,
} from '../../../shared/ui/molecules/date-range-filter/date-range-filter';
import { ErrorState } from '../../../shared/ui/molecules/error-state/error-state';
import { MetricTile } from '../../../shared/ui/molecules/metric-tile/metric-tile';
import { PageHeader } from '../../../shared/ui/molecules/page-header/page-header';

/**
 * Qué bloques dibuja una pantalla de métricas. Cada destino del panel enciende
 * los suyos desde `data.metricsView` en `admin.routes.ts`.
 */
export interface MetricsView {
  readonly kicker: string;
  readonly heading: string;
  readonly description: string;
  /** Qué tarjetas de la respuesta `summary` mostrar, y en qué orden. */
  readonly tiles: readonly MetricTileKey[];
  readonly showDaily?: boolean;
  readonly showByStatus?: boolean;
  readonly showByStablishment?: boolean;
  readonly showByDoctor?: boolean;
}

export type MetricTileKey =
  | 'turnsToday'
  | 'turnsTotal'
  | 'turnsPending'
  | 'turnsTreated'
  | 'turnsCancelled'
  | 'schedulesFree'
  | 'totalPatients'
  | 'activePatients'
  | 'totalDoctors'
  | 'totalOperators'
  | 'totalStablishments'
  | 'totalServices';

/** Etiqueta y aclaración de cada tarjeta. La aclaración es la mitad del dato. */
const TILES: Readonly<Record<MetricTileKey, { label: string; hint?: string }>> = {
  turnsToday: { label: 'Turnos hoy', hint: 'Del día actual, sin importar el período elegido.' },
  turnsTotal: { label: 'Turnos', hint: 'En el período seleccionado.' },
  turnsPending: { label: 'Pendientes', hint: 'Todavía sin atender.' },
  turnsTreated: { label: 'Atendidos' },
  turnsCancelled: { label: 'Cancelados' },
  schedulesFree: { label: 'Cupos libres', hint: 'Capacidad que quedó sin usar.' },
  totalPatients: { label: 'Pacientes', hint: 'Total registrados, no depende del período.' },
  activePatients: { label: 'Pacientes activos', hint: 'Con al menos un turno en el período.' },
  totalDoctors: { label: 'Doctores', hint: 'Total registrados.' },
  totalOperators: { label: 'Operadores', hint: 'Total registrados.' },
  totalStablishments: { label: 'Sedes', hint: 'Total registradas.' },
  totalServices: { label: 'Servicios', hint: 'Total en catálogo.' },
};

/**
 * app-metrics-page — UNA pantalla para los seis destinos de métricas del panel:
 * Dashboard (Resumen general, Analytics), Métricas (Establecimientos, Empleados,
 * Pacientes) y Reportes → General.
 *
 * LA CONFIGURACIÓN VIENE DE LA RUTA, igual que en Vacaciones/Permisos. Los seis
 * destinos son la misma mecánica — elegir un período, pedir agregados, dibujar
 * tarjetas y barras — y lo único que cambia es qué bloques se encienden. Seis
 * componentes serían seis lugares donde arreglar el mismo manejo de rango.
 *
 * PIDE SOLO LO QUE VA A DIBUJAR. Un `forkJoin` armado según la vista, no cinco
 * requests siempre: la pantalla de Establecimientos no tiene por qué traer el
 * agrupamiento por doctor.
 *
 * UN BLOQUE QUE FALLA NO TUMBA LA PANTALLA. Cada request lleva su propio
 * `catchError` que devuelve vacío, así que si el agrupamiento por doctor da
 * error las tarjetas igual se pintan. Solo el `summary` es bloqueante: sin él no
 * hay pantalla, y ahí sí aparece `app-error-state` con su reintento.
 *
 * NO HAY GRÁFICO DE LÍNEAS. El proyecto no tiene librería de gráficos y la serie
 * diaria se dibuja con `app-bar-list`, que es un gráfico de barras de verdad. Un
 * eje temporal con zoom y tooltips es otra conversación, y trae 200kB.
 */
@Component({
  selector: 'app-metrics-page',
  imports: [BarList, DateRangeFilter, ErrorState, MetricTile, PageHeader],
  templateUrl: './metrics-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class MetricsPageComponent implements OnInit {
  private readonly api = inject(MetricsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });

  protected readonly view = computed<MetricsView>(() => {
    const value = this.data()['metricsView'] as MetricsView | undefined;
    return (
      value ?? {
        kicker: 'Panel',
        heading: 'Métricas',
        description: 'Agregados sobre turnos, agenda y catálogos.',
        tiles: ['turnsTotal'],
      }
    );
  });

  protected readonly range = signal<MetricRange>({});
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly summary = signal<MetricSummary | null>(null);
  protected readonly byStatus = signal<readonly MetricGroup[]>([]);
  protected readonly byStablishment = signal<readonly MetricGroup[]>([]);
  protected readonly byDoctor = signal<readonly MetricGroup[]>([]);

  /** Las tarjetas ya resueltas: etiqueta, aclaración y valor. */
  protected readonly tiles = computed(() => {
    const summary = this.summary();
    return this.view().tiles.map((key) => ({
      key,
      label: TILES[key].label,
      hint: TILES[key].hint,
      value: summary ? (summary[key] ?? null) : null,
    }));
  });

  /** La serie diaria como barras. La fecha se acorta: la barra ya da el contexto. */
  protected readonly dailyItems = computed<readonly BarListItem[]>(() =>
    (this.summary()?.turnsByDay ?? []).map((point) => ({
      id: point.date,
      label: point.date,
      total: point.total,
    })),
  );

  protected readonly statusItems = computed<readonly BarListItem[]>(() =>
    this.byStatus().map((group) => ({ id: group.id, label: group.label, total: group.total })),
  );

  protected readonly stablishmentItems = computed<readonly BarListItem[]>(() =>
    this.byStablishment().map((group) => ({
      id: group.id,
      label: group.label,
      total: group.total,
    })),
  );

  protected readonly doctorItems = computed<readonly BarListItem[]>(() =>
    this.byDoctor().map((group) => ({ id: group.id, label: group.label, total: group.total })),
  );

  /** El período que la pantalla está mostrando, dicho en palabras. */
  protected readonly periodLabel = computed(() => {
    const { from, to } = this.range();
    if (!from && !to) {
      return 'Todo el histórico';
    }
    if (from && to) {
      return `Del ${from} al ${to}`;
    }
    return from ? `Desde el ${from}` : `Hasta el ${to}`;
  });

  ngOnInit(): void {
    this.load();
  }

  protected onRangeChange(range: DateRange): void {
    this.range.set({ from: range.from, to: range.to });
    this.load();
  }

  protected load(): void {
    const view = this.view();
    const range = this.range();

    this.loading.set(true);
    this.loadError.set(false);

    // Un bloque secundario que falla devuelve vacío en vez de tumbar la
    // pantalla; el `summary` no lleva `catchError` porque sin él no hay nada.
    const empty = of([] as MetricGroup[]);

    forkJoin({
      summary: this.api.getSummary(range),
      byStatus: view.showByStatus
        ? this.api.getTurnsByStatus(range).pipe(catchError(() => empty))
        : empty,
      byStablishment: view.showByStablishment
        ? this.api.getTurnsByStablishment(range).pipe(catchError(() => empty))
        : empty,
      byDoctor: view.showByDoctor
        ? this.api.getTurnsByDoctor(range).pipe(catchError(() => empty))
        : empty,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.summary.set(result.summary);
          this.byStatus.set(result.byStatus);
          this.byStablishment.set(result.byStablishment);
          this.byDoctor.set(result.byDoctor);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set(true);
          this.loading.set(false);
        },
      });
  }
}
