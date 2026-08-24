import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { Button } from '../../atoms/button/button';

/** Un rango de fechas en ISO `YYYY-MM-DD`. Cualquiera de los dos puede faltar. */
export interface DateRange {
  readonly from?: string;
  readonly to?: string;
}

/**
 * app-date-range-filter — el par desde/hasta que encabeza las pantallas de
 * métricas, calendario, feriados y ausencias.
 *
 * `<input type="date">` NATIVO, no un date-picker propio. El nativo trae el
 * calendario del sistema operativo, el teclado numérico del teléfono, el formato
 * de fecha del locale del usuario y la navegación por teclado — todo eso hay que
 * reimplementarlo, y mal, para ganar control sobre los colores.
 *
 * EL FILTRO NO SE APLICA AL TIPEAR. Escribir una fecha pasa por estados
 * intermedios (el año a medio escribir es `0002`), y cada uno dispararía un
 * request contra el backend por un rango sin sentido. Se aplica al confirmar.
 *
 * VALIDA QUE EL RANGO TENGA SENTIDO antes de emitir: con `desde` posterior a
 * `hasta` el backend devuelve una lista vacía, que se lee como "no hay datos" en
 * vez de "te equivocaste de fechas".
 */
@Component({
  selector: 'app-date-range-filter',
  imports: [Button],
  templateUrl: './date-range-filter.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class DateRangeFilter {
  readonly from = input<string | undefined>(undefined);
  readonly to = input<string | undefined>(undefined);
  readonly disabled = input(false);

  readonly rangeChange = output<DateRange>();

  protected readonly draftFrom = signal<string>('');
  protected readonly draftTo = signal<string>('');
  protected readonly touched = signal(false);

  /** Antes de tocar nada, el borrador es lo que llegó por input. */
  protected readonly currentFrom = computed(() =>
    this.touched() ? this.draftFrom() : (this.from() ?? ''),
  );
  protected readonly currentTo = computed(() =>
    this.touched() ? this.draftTo() : (this.to() ?? ''),
  );

  protected readonly invalid = computed(() => {
    const from = this.currentFrom();
    const to = this.currentTo();
    return Boolean(from && to && from > to);
  });

  protected onFrom(value: string): void {
    this.touched.set(true);
    this.draftTo.set(this.currentTo());
    this.draftFrom.set(value);
  }

  protected onTo(value: string): void {
    this.touched.set(true);
    this.draftFrom.set(this.currentFrom());
    this.draftTo.set(value);
  }

  protected apply(): void {
    if (this.invalid()) {
      return;
    }
    this.rangeChange.emit({
      from: this.currentFrom() || undefined,
      to: this.currentTo() || undefined,
    });
  }

  protected clear(): void {
    this.touched.set(true);
    this.draftFrom.set('');
    this.draftTo.set('');
    this.rangeChange.emit({});
  }
}
