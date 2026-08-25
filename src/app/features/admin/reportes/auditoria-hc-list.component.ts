import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ClinicalAccessLogApiService } from '../../../core/api/clinical-access-log-api.service';
import { extractApiErrorMessage, isPermissionDeniedError } from '../metrics-shared/turn-status.util';
import type { ClinicalAccessLog, ClinicalResourceType, Page } from '../../../core/models';

/** Same Spanish labels for every clinical-read kind this log records. */
const RESOURCE_TYPE_LABELS: Record<ClinicalResourceType, string> = {
  ENCOUNTER: 'Historia clínica (detalle)',
  ENCOUNTER_LIST: 'Historial clínico (listado)',
  PRESCRIPTION: 'Receta (detalle)',
  PRESCRIPTION_LIST: 'Recetas (listado)',
};

const ROLE_LABELS: Record<string, string> = {
  ROLE_ADMIN: 'Administrador',
  ROLE_DOCTOR: 'Doctor',
  ROLE_EMPLOYEE: 'Personal',
  ROLE_PATIENT: 'Paciente',
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  ROLE_ADMIN: 'bg-purple-50 text-purple-700 border border-purple-200',
  ROLE_DOCTOR: 'bg-blue-50 text-blue-700 border border-blue-200',
  ROLE_EMPLOYEE: 'bg-amber-50 text-amber-700 border border-amber-200',
  ROLE_PATIENT: 'bg-slate-50 text-slate-700 border border-slate-200',
};

/**
 * app-auditoria-hc-list — "reportes/auditoria-hc" (`GET /api/clinical-access-logs`,
 * ROLE_ADMIN only). This is an ACCESS log, not an edit log: it answers "who
 * READ this patient's history", never "who changed it" — `create()`/
 * `update()` on Encounter/Prescription never write here (see
 * `ClinicalAccessLogService` in Backend_QMS).
 *
 * `resourceId` is `null` for the `*_LIST` resource types (a browse call logs
 * ONE row, not one per result) — rendered explicitly as "Listado completo",
 * never as a blank cell, so a reader can tell "opened one record" from
 * "browsed the list" at a glance.
 */
@Component({
  selector: 'app-auditoria-hc-list',
  imports: [FormsModule],
  templateUrl: './auditoria-hc-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditoriaHcListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ClinicalAccessLogApiService);

  protected readonly data = signal<Page<ClinicalAccessLog> | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly patientFilter = signal<string>('');
  private appliedPatientId: string | undefined;

  ngOnInit(): void {
    const patientId = this.route.snapshot.queryParamMap.get('patientId');
    if (patientId) {
      this.patientFilter.set(patientId);
      this.appliedPatientId = patientId;
    }
    this.loadPage(0);
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getAll(this.appliedPatientId, page, 10).subscribe({
      next: (pageData) => {
        this.data.set(pageData);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.describeError(err, 'No se pudieron cargar los registros de auditoría.'));
        this.loading.set(false);
      },
    });
  }

  applyFilter(): void {
    this.appliedPatientId = this.patientFilter().trim() || undefined;
    this.loadPage(0);
  }

  resetFilter(): void {
    this.patientFilter.set('');
    this.appliedPatientId = undefined;
    this.loadPage(0);
  }

  private describeError(err: unknown, fallback: string): string {
    const message = extractApiErrorMessage(err, fallback);
    if (isPermissionDeniedError(err, message)) {
      return `${message} Esta sección de auditoría es exclusiva para administradores.`;
    }
    return message;
  }

  resourceTypeLabel(type: ClinicalResourceType): string {
    return RESOURCE_TYPE_LABELS[type] ?? type;
  }

  isListRead(type: ClinicalResourceType): boolean {
    return type.endsWith('_LIST');
  }

  roleLabel(role?: string): string {
    return (role && ROLE_LABELS[role]) || role || '-';
  }

  roleBadgeClass(role?: string): string {
    return (role && ROLE_BADGE_CLASS[role]) || 'bg-slate-50 text-slate-700 border border-slate-200';
  }

  /** Pure string slicing — never `new Date()` (UTC parsing shifts the day in UTC-5). */
  formatAccessedAt(iso: string): string {
    const [datePart, timePart] = iso.split('T');
    const [year, month, day] = datePart.split('-');
    const time = (timePart ?? '').slice(0, 5);
    return `${day}/${month}/${year} ${time}`;
  }
}
