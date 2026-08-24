import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Skeleton } from '../../atoms/skeleton/skeleton';

/** Una fila del listado: qué se mide y cuánto. */
export interface BarListItem {
  readonly id: string;
  readonly label: string;
  readonly total: number;
}

/**
 * app-bar-list — un agrupamiento dibujado como barras horizontales con su
 * etiqueta y su valor.
 *
 * ES UN GRÁFICO DE BARRAS DE VERDAD, no un sustituto de uno. El proyecto no
 * tiene librería de gráficos y meter una para pintar cinco agrupamientos sería
 * traer 200kB para algo que un `div` con `width: %` resuelve. Cuando haga falta
 * una serie temporal con ejes, zoom y tooltips, ahí se discute la librería.
 *
 * LA BARRA SE MIDE CONTRA EL MÁXIMO DE LA LISTA, no contra el total. Contra el
 * total, cinco categorías parejas dan cinco barras del 20% y no se ve nada;
 * contra el máximo, la primera llena la fila y las demás se leen en relación a
 * ella, que es la comparación que la pantalla quiere hacer.
 *
 * ACCESIBILIDAD: la barra es decorativa (`aria-hidden`) y el valor va en texto
 * al lado. Un lector de pantalla lee "Sede Norte, 128", que es el dato — no un
 * ancho en porcentaje.
 */
@Component({
  selector: 'app-bar-list',
  imports: [Skeleton],
  templateUrl: './bar-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class BarList {
  readonly items = input.required<readonly BarListItem[]>();
  readonly loading = input(false);
  readonly emptyMessage = input('No hay datos para el período seleccionado.');
  /** Filas de esqueleto mientras carga. */
  readonly skeletonRows = input(5);
  /** Corta la lista y avisa cuántas quedaron fuera. 0 = sin límite. */
  readonly limit = input(0);

  private readonly max = computed(() => Math.max(1, ...this.items().map((item) => item.total)));

  protected readonly visible = computed(() => {
    const limit = this.limit();
    const items = this.items();
    return limit > 0 ? items.slice(0, limit) : items;
  });

  /** Nunca en silencio: si la lista se recorta, la pantalla lo dice. */
  protected readonly hidden = computed(() =>
    Math.max(0, this.items().length - this.visible().length),
  );

  protected readonly placeholders = computed(() =>
    Array.from({ length: Math.max(1, this.skeletonRows()) }, (_, index) => index),
  );

  protected percent(total: number): number {
    return Math.round((total / this.max()) * 100);
  }

  protected format(total: number): string {
    return total.toLocaleString('es-EC');
  }
}
