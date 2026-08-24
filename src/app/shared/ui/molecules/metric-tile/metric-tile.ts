import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Figure, type FigureTone } from '../../atoms/figure/figure';
import { Skeleton } from '../../atoms/skeleton/skeleton';

/**
 * app-metric-tile — un número del panel con su etiqueta: las tarjetas del
 * Dashboard y de Métricas.
 *
 * COMPONE `app-figure`, no dibuja el número por su cuenta. Ese átomo ya trae la
 * Nunito 800 con `tabular-nums`, y las cifras tabulares son lo que hace que una
 * fila de tarjetas no baile cuando un contador pasa de 99 a 100.
 *
 * `loading` pinta un esqueleto con la MISMA geometría que el número cargado, no
 * un spinner: es el contrato de esqueletos del sistema, y una grilla de ocho
 * tarjetas que cambia de alto al llegar los datos es la peor versión de esta
 * pantalla.
 *
 * NO tiene tendencia, ni flecha, ni porcentaje contra el período anterior. El
 * backend no devuelve el período anterior, así que cualquier flecha sería
 * inventada — y este panel ya decidió que un número inventado enseña a
 * desconfiar de todos los demás.
 */
@Component({
  selector: 'app-metric-tile',
  imports: [Figure, Skeleton],
  templateUrl: './metric-tile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class MetricTile {
  readonly label = input.required<string>();
  readonly value = input<number | null>(null);
  /** Una línea de contexto bajo el número. */
  readonly hint = input<string | undefined>(undefined);
  readonly tone = input<FigureTone>('ink');
  readonly loading = input(false);

  /** `—` y no `0` cuando todavía no hay dato: cero es una respuesta, vacío no. */
  protected readonly display = computed(() => {
    const value = this.value();
    return value == null ? '—' : value.toLocaleString('es-EC');
  });
}
