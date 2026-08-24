import { DestroyRef, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';

import type { Page } from '../../core/models';
import type { PaginationState } from '../../shared/ui/molecules/pagination/pagination';
import { toPaginationState } from './page-state';

/** Lo que el store necesita saber para cargar una página. */
export interface AdminListStoreConfig<T> {
  readonly destroyRef: DestroyRef;
  /** Cómo se pide una página. El store no sabe de qué endpoint viene. */
  readonly load: (page: number) => Observable<Page<T>>;
  readonly pageSize?: number;
}

/**
 * El estado que TODA sección de listado del panel repite: la página, si está
 * cargando, si la carga falló, el aviso de éxito, el error del diálogo abierto y
 * si hay una escritura en vuelo.
 *
 * ES UNA CLASE QUE SE COMPONE, NO UNA CLASE BASE. Los componentes la tienen como
 * campo (`protected readonly list = createAdminListStore(...)`) en vez de
 * heredarla. Heredar mezclaría este estado con el ciclo de vida del componente y
 * haría que cada sección pueda pisar un método sin que se note; como campo, lo
 * que el store expone es exactamente lo que el template usa.
 *
 * POR QUÉ EXISTE: las primeras cuatro secciones del panel repitieron estas
 * sesenta líneas una vez cada una. Con las secciones nuevas iban a ser once
 * copias, y la undécima es donde una de ellas se olvida de recargar la página
 * actual, o de dar de baja la suscripción, y nadie lo nota. Las cuatro
 * originales ya fueron migradas: hoy las ONCE secciones de listado del panel
 * usan esto y no queda ninguna copia a mano.
 *
 * DOS COMPONENTES DEL PANEL NO LO USAN, y es correcto que no lo usen:
 *
 *   - `doctor-detail` es una pantalla de DETALLE. No tiene página, ni filas, ni
 *     paginador, así que `data: Page<T>`, `rows`, `pagination` y
 *     `pageAfterDelete` no significan nada ahí. Comparte los tres canales de
 *     error y su propio `run`, que es la parte que sí se repite — si algún día
 *     aparece un segundo detalle con escrituras, ESA es la señal para partir
 *     este store en dos (uno de escritura, uno de listado). Con un solo caso,
 *     partirlo es abstraer de más.
 *   - `metrics-page` solo lee: tiene `loading` y `loadError` y nada más. No hay
 *     escrituras, ni diálogos, ni paginado.
 *
 * LOS DOS CANALES DE ERROR SIGUEN SEPARADOS, que es la decisión que el panel ya
 * tomó: `loadError` reemplaza la tabla (no hay nada que mostrar), `dialogError`
 * se pinta DENTRO del diálogo abierto (la tabla de atrás sigue siendo verdad, y
 * un cartel en la página quedaría invisible bajo el velo del `<dialog>`).
 */
export class AdminListStore<T> {
  readonly data = signal<Page<T> | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  /** Éxito, en la página, después de que el diálogo se cerró. */
  readonly notice = signal<string | null>(null);
  /** Fallo de una escritura lanzada DESDE UN DIÁLOGO, que sigue abierto. */
  readonly dialogError = signal<string | null>(null);
  /**
   * Fallo de una escritura lanzada DESDE LA PÁGINA — el botón de una fila, un
   * cambio de estado. Es un tercer canal y no un lujo: `dialogError` se pinta
   * dentro del `<dialog>`, así que un error de un botón de tabla escrito ahí no
   * se ve en ninguna parte, porque no hay diálogo abierto donde mostrarlo.
   */
  readonly pageError = signal<string | null>(null);
  /** Hay una escritura en vuelo. */
  readonly pending = signal(false);

  readonly rows = computed<readonly T[]>(() => this.data()?.content ?? []);

  readonly pagination = computed<PaginationState | null>(() => {
    const page = this.data();
    return page ? toPaginationState(page) : null;
  });

  constructor(private readonly config: AdminListStoreConfig<T>) {}

  /** La página que se está viendo, o 0 si todavía no llegó ninguna. */
  get currentPage(): number {
    return this.data()?.number ?? 0;
  }

  loadPage(page: number = this.currentPage): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.config
      .load(page)
      .pipe(takeUntilDestroyed(this.config.destroyRef))
      .subscribe({
        next: (result) => {
          this.data.set(result);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set(true);
          this.loading.set(false);
        },
      });
  }

  /** Al abrir cualquier diálogo: la pantalla arranca sin mensajes viejos. */
  resetMessages(): void {
    this.notice.set(null);
    this.dialogError.set(null);
    this.pageError.set(null);
  }

  /**
   * Borrar la única fila que quedaba en una página recargaría una página vacía
   * con un paginador que todavía dice que hay tres. Retrocede una.
   */
  pageAfterDelete(): number {
    const page = this.data();
    if (!page) {
      return 0;
    }
    return page.numberOfElements === 1 && page.number > 0 ? page.number - 1 : page.number;
  }

  /**
   * La forma que toda escritura comparte: bloquear, cerrar y recargar si salió
   * bien, dejar el diálogo abierto y decir por qué si salió mal.
   *
   * Recarga la página ACTUAL y no la cero: renombrar una fila de la página tres
   * no debería devolver al usuario al principio de la lista.
   *
   * `onSuccess` es donde el componente cierra su propio diálogo — el store no
   * sabe qué diálogos existen y no tiene por qué saberlo.
   */
  run<R>(options: {
    request$: Observable<R>;
    success: string;
    failure: string;
    reloadPage?: number;
    onSuccess?: () => void;
    /** `'page'` para acciones de fila, que no tienen diálogo donde mostrar el error. */
    errorChannel?: 'dialog' | 'page';
  }): void {
    const target = options.reloadPage ?? this.currentPage;
    const channel = options.errorChannel ?? 'dialog';

    this.pending.set(true);
    this.dialogError.set(null);
    this.pageError.set(null);

    options.request$.pipe(takeUntilDestroyed(this.config.destroyRef)).subscribe({
      next: () => {
        this.pending.set(false);
        options.onSuccess?.();
        this.notice.set(options.success);
        this.loadPage(target);
      },
      error: () => {
        this.pending.set(false);
        if (channel === 'page') {
          this.pageError.set(options.failure);
        } else {
          this.dialogError.set(options.failure);
        }
      },
    });
  }
}

export function createAdminListStore<T>(config: AdminListStoreConfig<T>): AdminListStore<T> {
  return new AdminListStore<T>(config);
}
