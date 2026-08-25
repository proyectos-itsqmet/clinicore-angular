import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DoctorApiService } from '../../../core/api/doctor-api.service';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { ScheduleApiService } from '../../../core/api/schedule-api.service';
import { ServicioApiService } from '../../../core/api/servicio-api.service';
import type { AdminDoctor, Establishment, Page, ScheduleDTO, ScheduleStatus, Servicio } from '../../../core/models';

interface ScheduleDayGroup {
  date: string;
  slots: ScheduleDTO[];
}

const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** The default range spans today..today+6 (inclusive) — one calendar week. */
const DAYS_IN_DEFAULT_RANGE = 6;

function isoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * app-calendario-list — "Calendario": the only admin screen that shows
 * schedule slots across a DATE RANGE instead of one day at a time (which is
 * what `administracion/especialidades/:id` already offers, scoped to a
 * single service). Reuses `ScheduleApiService.getAll` with its `from`/`to`
 * range params — no new API, the same rule `precios/citas` already follows
 * for `Servicio`.
 *
 * Slots are grouped into day sections client-side: a flat, paginated table
 * of two hundred rows across a week is not something an operator can scan
 * as a calendar. The underlying request is still paged (`size` below), so
 * an unfiltered wide range still degrades to "Siguiente" instead of one
 * unbounded payload.
 */
@Component({
  selector: 'app-calendario-list',
  imports: [FormsModule],
  templateUrl: './calendario-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarioListComponent implements OnInit {
  private readonly scheduleApi = inject(ScheduleApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly servicioApi = inject(ServicioApiService);
  private readonly doctorApi = inject(DoctorApiService);

  // Filter catalogs
  protected readonly establishments = signal<Establishment[]>([]);
  protected readonly services = signal<Servicio[]>([]);
  protected readonly doctors = signal<AdminDoctor[]>([]);

  // Date range — both bounds derive from the SAME instant by default, so
  // "today" can never read differently between `rangeFrom` and `rangeTo`.
  private readonly initialToday = new Date();
  protected readonly rangeFrom = signal<string>(isoDate(this.initialToday));
  protected readonly rangeTo = signal<string>(isoDate(addDays(this.initialToday, DAYS_IN_DEFAULT_RANGE)));

  // Filters
  protected readonly filterEstablishmentId = signal<number | null>(null);
  protected readonly filterServiceId = signal<number | null>(null);
  protected readonly filterDoctorId = signal<string | null>(null);
  protected readonly filterStatus = signal<string>('');

  // Result
  protected readonly schedulesPage = signal<Page<ScheduleDTO> | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly hasActiveFilters = computed(
    () =>
      this.filterEstablishmentId() !== null ||
      this.filterServiceId() !== null ||
      this.filterDoctorId() !== null ||
      this.filterStatus() !== '',
  );

  protected readonly groupedByDay = computed<ScheduleDayGroup[]>(() => {
    const content = this.schedulesPage()?.content ?? [];
    const byDate = new Map<string, ScheduleDTO[]>();

    for (const slot of content) {
      const existing = byDate.get(slot.date);
      if (existing) {
        existing.push(slot);
      } else {
        byDate.set(slot.date, [slot]);
      }
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, slots]) => ({ date, slots }));
  });

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadSchedules(0);
  }

  private loadCatalogs(): void {
    // Secondary catalogs (populate the filter `<select>`s): if one fails,
    // that filter just falls back to showing only "Todos" instead of
    // blocking the schedules load, which is the primary data set.
    this.establishmentApi.getAll(0, 100).subscribe({
      next: (page) => this.establishments.set(page.content ?? []),
      error: () => this.establishments.set([]),
    });
    this.servicioApi.getAll(0, 100).subscribe({
      next: (page) => this.services.set(page.content ?? []),
      error: () => this.services.set([]),
    });
    this.doctorApi.getAll(0, 100).subscribe({
      next: (page) => this.doctors.set(page.content ?? []),
      error: () => this.doctors.set([]),
    });
  }

  // Bulk selection
  protected readonly selectedIds = signal<Set<number>>(new Set());

  loadSchedules(page: number = 0): void {
    this.loading.set(true);
    this.error.set(null);
    this.selectedIds.set(new Set()); // Reset selection on page load

    this.scheduleApi
      .getAll({
        from: this.rangeFrom(),
        to: this.rangeTo(),
        stablishmentId: this.filterEstablishmentId() ?? undefined,
        serviceId: this.filterServiceId() ?? undefined,
        doctorId: this.filterDoctorId() ?? undefined,
        status: this.filterStatus() || undefined,
        page,
        size: 50,
      })
      .subscribe({
        next: (pageData) => {
          this.schedulesPage.set(pageData);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los horarios del rango seleccionado.');
          this.loading.set(false);
        },
      });
  }

  toggleSelection(id: number): void {
    const current = new Set(this.selectedIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedIds.set(current);
  }

  toggleSelectAll(): void {
    const currentItems = this.schedulesPage()?.content ?? [];
    const current = this.selectedIds();
    if (current.size === currentItems.length && currentItems.length > 0) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(currentItems.map((s) => s.id!)));
    }
  }

  isAllSelected(): boolean {
    const currentItems = this.schedulesPage()?.content ?? [];
    return currentItems.length > 0 && this.selectedIds().size === currentItems.length;
  }

  bulkDelete(): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar ${ids.length} horarios seleccionados?`)) return;

    this.scheduleApi.bulkDelete(ids).subscribe({
      next: () => {
        this.loadSchedules(this.schedulesPage()?.number ?? 0);
      },
      error: () => {
        alert('Ocurrió un error al intentar eliminar algunos horarios. Verifica que no estén reservados.');
      }
    });
  }

  bulkUpdateStatus(status: 'STATUS_FREE' | 'STATUS_UNAVAILABLE'): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;

    this.scheduleApi.bulkUpdateStatus(status, ids).subscribe({
      next: () => {
        this.loadSchedules(this.schedulesPage()?.number ?? 0);
      },
      error: () => {
        alert('Ocurrió un error al actualizar los estados.');
      }
    });
  }

  onRangeFromChange(value: string): void {
    this.rangeFrom.set(value);
    this.loadSchedules(0);
  }

  onRangeToChange(value: string): void {
    this.rangeTo.set(value);
    this.loadSchedules(0);
  }

  onEstablishmentFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const id = value ? Number(value) : null;
    this.filterEstablishmentId.set(id !== null && !isNaN(id) ? id : null);
    this.loadSchedules(0);
  }

  onServiceFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const id = value ? Number(value) : null;
    this.filterServiceId.set(id !== null && !isNaN(id) ? id : null);
    this.loadSchedules(0);
  }

  onDoctorFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterDoctorId.set(value || null);
    this.loadSchedules(0);
  }

  onStatusFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterStatus.set(value);
    this.loadSchedules(0);
  }

  resetFilters(): void {
    this.filterEstablishmentId.set(null);
    this.filterServiceId.set(null);
    this.filterDoctorId.set(null);
    this.filterStatus.set('');
    this.loadSchedules(0);
  }

  weekdayLabel(isoDateStr: string): string {
    const parsed = new Date(`${isoDateStr}T00:00:00`);
    return WEEKDAY_LABELS[parsed.getDay()] ?? '';
  }

  statusBadgeClass(status: ScheduleStatus | string | undefined): string {
    switch (status) {
      case 'STATUS_FREE':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'STATUS_OCCUPIED':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'STATUS_UNAVAILABLE':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  }

  statusLabel(status: ScheduleStatus | string | undefined): string {
    switch (status) {
      case 'STATUS_FREE':
        return 'Disponible';
      case 'STATUS_OCCUPIED':
        return 'Ocupado';
      case 'STATUS_UNAVAILABLE':
        return 'No disponible';
      default:
        return 'Desconocido';
    }
  }
}
