import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { AdminModuleApiService } from '../../../core/api/admin-module-api.service';
import { extractApiErrorMessage, isPermissionDeniedError } from '../metrics-shared/turn-status.util';
import type { AdminModule } from '../../../core/models';

/**
 * app-modules-list — "Módulos" (`GET`/`PUT /api/admin-modules/{moduleKey}`).
 *
 * HONESTY GATE (the reason this screen exists): mirrors `AdminModule`'s own
 * docblock in Backend_QMS. Toggling a row here changes what
 * `GET /api/admin-modules` reports — NOTHING ELSE. No menu entry is hidden,
 * no Angular route is blocked, no backend endpoint is gated by it yet. The
 * banner below is rendered PERMANENTLY (not a tooltip, never conditionally
 * hidden) so an admin who flips a switch never walks away believing the
 * section actually turned off.
 *
 * Fixed catalog (12 seeded rows, no create/delete on the backend
 * controller) — this screen has no create/delete affordance on purpose.
 *
 * A toggle is a ROW-BUTTON write with no dialog to render its error inside,
 * so failures use a PAGE-level error channel (`toggleError`), never a
 * dialog-only one — same reasoning `clinicore-admin-list-store`'s three
 * error channels document, applied directly since that store class itself
 * does not exist on `main`.
 */
@Component({
  selector: 'app-modules-list',
  imports: [],
  templateUrl: './modules-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulesListComponent implements OnInit {
  private readonly api = inject(AdminModuleApiService);

  protected readonly modules = signal<AdminModule[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly togglingKey = signal<string | null>(null);
  protected readonly toggleError = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getAll().subscribe({
      next: (modules) => {
        this.modules.set(modules);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudieron cargar los módulos.'));
        this.loading.set(false);
      },
    });
  }

  toggle(item: AdminModule): void {
    this.togglingKey.set(item.moduleKey);
    this.toggleError.set(null);

    this.api.setEnabled(item.moduleKey, !item.enabled).subscribe({
      next: (updated) => {
        this.togglingKey.set(null);
        this.modules.update((current) => current.map((m) => (m.moduleKey === updated.moduleKey ? updated : m)));
      },
      error: (err) => {
        this.togglingKey.set(null);
        // Rejected write (e.g. the self-lockout guard on `modulos`, or a
        // non-admin caller) is NEVER applied optimistically — `modules`
        // is left untouched, so the row keeps showing its real, unchanged state.
        const message = extractApiErrorMessage(err, 'Ocurrió un error al actualizar el módulo.');
        this.toggleError.set(
          isPermissionDeniedError(err, message)
            ? 'No tienes permisos para esta acción: solo un Administrador puede habilitar o deshabilitar módulos.'
            : message,
        );
      },
    });
  }
}
