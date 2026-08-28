import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { TurnApiService } from '../../../core/api/turn-api.service';
import { fetchAllPages } from '../../../core/api/fetch-all-pages.util';
import type { Establishment, TurnDailyCounts, TurnScopeCount } from '../../../core/models';

/**
 * "Pantalla turnos": elige una sede y abre su pantalla de sala.
 *
 * POR QUÉ EXISTE. `/sala/:sedeId` lleva el id numérico del establecimiento, y
 * ese id no aparece en ninguna pantalla de la aplicación. Hasta ahora había que
 * adivinarlo o sacarlo de la base a mano — y equivocarse NO da error: da un
 * televisor que parece congelado porque está mostrando los turnos de otra sede.
 * Esa confusión ya costó una tarde entera de depuración.
 *
 * Abre en una PESTAÑA NUEVA. La pantalla de sala es un kiosco a pantalla
 * completa, sin menú ni forma de volver: navegar dentro de la misma pestaña
 * deja al administrador atrapado, con el botón "atrás" del navegador como única
 * salida. Y el caso real es una TV encendida al lado del panel, no en lugar de
 * él.
 */
@Component({
  selector: 'app-turn-screen-launcher',
  templateUrl: './turn-screen-launcher.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnScreenLauncherComponent implements OnInit {
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly turnApi = inject(TurnApiService);
  private readonly router = inject(Router);

  protected readonly establishments = signal<Establishment[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  /**
   * Una página de sedes no alcanza.
   *
   * `getAll` pagina de a 10 por defecto. Una clínica con doce sedes mostraría
   * diez y ocultaría dos sin decirlo — y las dos que faltan serían justo las
   * que alguien está buscando. `fetchAllPages` recorre todas y avisa si quedó
   * incompleta.
   */
  protected readonly incomplete = signal<boolean>(false);

  /**
   * Conteos del día por sede. `null` mientras carga o si el pedido falló.
   *
   * Las tarjetas distinguen ese caso de "cero turnos hoy": no son lo mismo, y
   * una tarjeta muda los confunde justo cuando hay que decidir qué pantalla
   * abrir.
   */
  protected readonly dailyCounts = signal<TurnDailyCounts | null>(null);

  ngOnInit(): void {
    this.load();
    this.loadCounts();
  }

  /**
   * No bloquea nada: si falla, las tarjetas quedan sin badge y la página sigue
   * abriendo pantallas. Un contador es apoyo para elegir, no un requisito.
   */
  private loadCounts(): void {
    this.turnApi.getDailyCounts().subscribe({
      next: (counts) => this.dailyCounts.set(counts),
      error: () => this.dailyCounts.set(null),
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    fetchAllPages((page) => this.establishmentApi.getAll(page, 100)).subscribe({
      next: ({ items, complete }) => {
        this.establishments.set(items);
        this.incomplete.set(!complete);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las sedes.');
        this.loading.set(false);
      },
    });
  }

  /** La ruta de la pantalla de esa sede. No se muestra: la abre el botón. */
  screenPath(establishment: Establishment): string {
    return `/sala/${establishment.id}`;
  }

  /** Turnos y pendientes de HOY en esa sede. `null` = ninguno, o aún cargando. */
  countsFor(id: number): TurnScopeCount | null {
    return this.dailyCounts()?.byStablishment.find((row) => row.id === id) ?? null;
  }

  open(establishment: Establishment): void {
    // `_blank` y no `router.navigate`: ver el docblock de la clase.
    window.open(this.router.serializeUrl(this.router.createUrlTree([this.screenPath(establishment)])), '_blank');
  }
}
