import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { localIsoDate } from '../../../core/date/local-iso-date';
import { SelectField, type SelectOption } from '../../../shared/ui/molecules/select-field/select-field';
import { FormsModule } from '@angular/forms';

import { DoctorApiService } from '../../../core/api/doctor-api.service';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { ScheduleApiService } from '../../../core/api/schedule-api.service';
import { ScheduleTemplateApiService } from '../../../core/api/schedule-template-api.service';
import { fetchAllPages } from '../../../core/api/fetch-all-pages.util';
import { extractApiErrorMessage, formatIsoDateEs, isPermissionDeniedError } from '../metrics-shared/turn-status.util';
import type { AdminDoctor, DayOfWeek, Establishment, Page, ScheduleTemplate, ScheduleTemplateWrite, Servicio } from '../../../core/models';

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

const DAY_OF_WEEK_OPTIONS: ReadonlyArray<{ value: DayOfWeek; label: string }> = [
  { value: 'MONDAY', label: 'Lunes' },
  { value: 'TUESDAY', label: 'Martes' },
  { value: 'WEDNESDAY', label: 'Miércoles' },
  { value: 'THURSDAY', label: 'Jueves' },
  { value: 'FRIDAY', label: 'Viernes' },
  { value: 'SATURDAY', label: 'Sábado' },
  { value: 'SUNDAY', label: 'Domingo' },
];

/**
 * app-schedule-template-list — "administracion/horarios"
 * (`GET/POST /save/PUT/DELETE /api/schedule-templates`,
 * `POST /api/schedules/generate-from-template`).
 *
 * HONESTY GATE (the reason this screen needs more than plain CRUD): a
 * `ScheduleTemplate` is a pure GENERATOR INPUT — `ScheduleTemplateService`
 * has no dependency on `ScheduleRepository` at all (see the entity's own
 * docblock in Backend_QMS). Editing or deleting a template NEVER touches an
 * already-generated `Schedule`, free or booked. The page banner below says so
 * permanently; the edit modal repeats it AT THE POINT OF EDITING (where an
 * admin narrowing hours would otherwise reasonably expect existing afternoon
 * slots to vanish) and points at Calendario for manual cleanup.
 *
 * Overlap is validated SERVER-SIDE ONLY (`ScheduleTemplateService#rejectIfOverlapping`,
 * strict `<`/`>` comparisons — a shared boundary instant, e.g. 08:00-12:00
 * then 12:00-16:00, is NOT an overlap). This component adds NO client-side
 * overlap check on purpose, so it can never be stricter than the server; the
 * server's real message is surfaced verbatim on a 400.
 *
 * One template = one weekday, mirroring `ScheduleTemplateDTO` 1:1 — there is
 * no multi-weekday fan-out here. The form says so permanently next to the day
 * field so "Lunes a Viernes" is understood as five separate submissions, not
 * a missing feature.
 *
 * Doctor selection loads the FULL catalog once (like
 * `specialty-detail.component.ts#loadAllDoctors` already does), not scoped
 * per service — `fetch-all-pages.util.ts`'s own docblock cautions against
 * "load everything" for doctors, but this mirrors an existing, already-live
 * precedent in this codebase rather than inventing a new one; any
 * doctor/service/establishment mismatch is still caught and reported
 * verbatim by the server (`validateDoctorAssignments`).
 */
@Component({
  selector: 'app-schedule-template-list',
  imports: [FormsModule, SelectField],
  templateUrl: './schedule-template-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleTemplateListComponent implements OnInit {
  private readonly api = inject(ScheduleTemplateApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly doctorApi = inject(DoctorApiService);
  private readonly scheduleApi = inject(ScheduleApiService);

  protected readonly DAY_OF_WEEK_OPTIONS = DAY_OF_WEEK_OPTIONS;

  /** Los días, como opciones del desplegable del sistema de diseño. */
  protected readonly DAY_OF_WEEK_SELECT_OPTIONS: readonly SelectOption[] = DAY_OF_WEEK_OPTIONS.map(
    (d) => ({ value: d.value, label: d.label }),
  );

  // Catálogos como opciones. Van todos por `computed` porque se cargan por red
  // y cambian: el de doctores y el de servicios además se vacían cada vez que
  // cambia el establecimiento elegido.
  protected readonly establishmentOptions = computed<readonly SelectOption[]>(() =>
    this.establishments().map((e) => ({ value: String(e.id), label: e.name })),
  );

  /** El del filtro suma "Todos": no filtrar es una elección válida. */
  protected readonly establishmentFilterOptions = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Todos los establecimientos' },
    ...this.establishmentOptions(),
  ]);

  /**
   * Los doctores del formulario, con "Cualquier doctor" ADELANTE.
   *
   * Acá la opción vacía sí corresponde y no es el placeholder: dejar la
   * plantilla sin doctor es una decisión real del usuario — significa "pool",
   * cualquiera disponible — y no la ausencia de una respuesta.
   */
  protected readonly formDoctorOptions = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Cualquier doctor disponible (pool)' },
    ...this.formDoctors().map((d) => ({
      value: d.uuid,
      label: `${d.firstName} ${d.lastName}`,
    })),
  ]);

  protected readonly formServiceOptions = computed<readonly SelectOption[]>(() =>
    this.formServices().map((s) => ({ value: String(s.id), label: s.name })),
  );

  protected readonly genDoctorOptions = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Cualquier doctor (pool)' },
    ...this.genDoctors().map((d) => ({
      value: d.uuid,
      label: `${d.firstName} ${d.lastName}`,
    })),
  ]);

  protected readonly genServiceOptions = computed<readonly SelectOption[]>(() =>
    this.genServices().map((s) => ({ value: String(s.id), label: s.name })),
  );

  protected readonly data = signal<Page<ScheduleTemplate> | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly filterStablishmentId = signal<number | null>(null);

  protected readonly establishments = signal<Establishment[]>([]);
  protected readonly establishmentsIncomplete = signal<boolean>(false);


  // --- Modal Crear/Editar ---
  protected readonly isFormModalOpen = signal<boolean>(false);
  protected readonly editingItem = signal<ScheduleTemplate | null>(null);
  protected readonly formLoading = signal<boolean>(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly submitAttempted = signal<boolean>(false);

  protected readonly formStablishmentId = signal<number | null>(null);
  protected readonly formServiceId = signal<number | null>(null);
  protected readonly formDoctorUuid = signal<string>('');
  protected readonly formDayOfWeek = signal<DayOfWeek | ''>('');
  protected readonly formStartTime = signal<string>('');
  protected readonly formEndTime = signal<string>('');
  protected readonly formSlotIntervalMinutes = signal<string>('30');
  protected readonly formValidFrom = signal<string>('');
  protected readonly formValidUntil = signal<string>('');

  protected readonly formServices = signal<Servicio[]>([]);
  protected readonly formServicesLoading = signal<boolean>(false);

  protected readonly formDoctors = signal<AdminDoctor[]>([]);
  protected readonly formDoctorsLoading = signal<boolean>(false);

  protected readonly formValid = computed(() => {
    const start = this.formStartTime();
    const end = this.formEndTime();
    const interval = Number(this.formSlotIntervalMinutes());
    const validFrom = this.formValidFrom();
    const validUntil = this.formValidUntil();

    return (
      this.formStablishmentId() != null &&
      this.formServiceId() != null &&
      !!this.formDayOfWeek() &&
      !!start &&
      !!end &&
      start < end &&
      Number.isFinite(interval) &&
      interval > 0 &&
      !!validFrom &&
      (!validUntil || validUntil >= validFrom)
    );
  });

  // --- Modal Eliminar ---
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly deletingItem = signal<ScheduleTemplate | null>(null);

  // --- Modal Generar Horarios desde Plantillas ---
  protected readonly isGenerateModalOpen = signal<boolean>(false);
  protected readonly generateLoading = signal<boolean>(false);
  protected readonly generateError = signal<string | null>(null);
  protected readonly generateSuccessMessage = signal<string | null>(null);

  protected readonly genStablishmentId = signal<number | null>(null);
  protected readonly genServiceId = signal<number | null>(null);
  protected readonly genDoctorUuid = signal<string>('');
  protected readonly genFrom = signal<string>('');
  protected readonly genTo = signal<string>('');

  protected readonly genServices = signal<Servicio[]>([]);
  protected readonly genServicesLoading = signal<boolean>(false);
  protected readonly genDoctors = signal<AdminDoctor[]>([]);
  protected readonly genDoctorsLoading = signal<boolean>(false);

  protected readonly genValid = computed(
    () => this.genStablishmentId() != null && this.genServiceId() != null && !!this.genFrom() && !!this.genTo() && this.genFrom() <= this.genTo(),
  );

  ngOnInit(): void {
    this.loadEstablishmentsCatalog();
    this.loadPage(0);
  }

  protected dayLabel(day: DayOfWeek): string {
    return DAY_LABELS[day];
  }

  protected readonly formatIsoDateEs = formatIsoDateEs;

  private loadEstablishmentsCatalog(): void {
    fetchAllPages((page) => this.establishmentApi.getAll(page, 100)).subscribe({
      next: ({ items, complete }) => {
        this.establishments.set(items);
        this.establishmentsIncomplete.set(!complete);
      },
      error: () => {
        // Fallback silencioso: los selectores quedan con lo que se haya cargado (si acaso).
      },
    });
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    const filters = this.filterStablishmentId() != null ? { stablishmentId: this.filterStablishmentId()! } : undefined;

    this.api.getAll(page, 10, filters).subscribe({
      next: (pageData) => {
        this.data.set(pageData);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiErrorMessage(err, 'No se pudieron cargar las plantillas de horario.'));
        this.loading.set(false);
      },
    });
  }

  onFilterChange(value: string): void {
    this.filterStablishmentId.set(value ? Number(value) : null);
    this.loadPage(0);
  }

  private describeWriteError(err: unknown, fallback: string): string {
    const message = extractApiErrorMessage(err, fallback);
    if (isPermissionDeniedError(err, message)) {
      return 'No tienes permisos para esta acción: solo un Administrador puede crear, editar o eliminar plantillas de horario.';
    }
    return message;
  }

  private loadFormDoctors(stablishmentId: number): void {
    this.formDoctorsLoading.set(true);
    fetchAllPages((page) => this.establishmentApi.getDoctors(stablishmentId, page, 100)).subscribe({
      next: ({ items }) => {
        this.formDoctors.set(items);
        this.formDoctorsLoading.set(false);
      },
      error: () => {
        this.formDoctorsLoading.set(false);
      },
    });
  }

  private loadFormServices(stablishmentId: number): void {
    this.formServicesLoading.set(true);
    fetchAllPages((page) => this.establishmentApi.getServices(stablishmentId, page, 100)).subscribe({
      next: ({ items }) => {
        this.formServices.set(items);
        this.formServicesLoading.set(false);
      },
      error: () => {
        this.formServicesLoading.set(false);
      },
    });
  }

  private toHm(hms: string): string {
    return hms.length >= 5 ? hms.slice(0, 5) : hms;
  }

  private toHms(hm: string): string {
    return hm.length === 5 ? `${hm}:00` : hm;
  }

  // --- Modal Crear/Editar ---
  openCreateModal(): void {
    this.editingItem.set(null);
    this.formStablishmentId.set(null);
    this.formServiceId.set(null);
    this.formDoctorUuid.set('');
    this.formDayOfWeek.set('');
    this.formStartTime.set('');
    this.formEndTime.set('');
    this.formSlotIntervalMinutes.set('30');
    this.formValidFrom.set(localIsoDate());
    this.formValidUntil.set('');
    this.formServices.set([]);
    this.formDoctors.set([]);
    this.formError.set(null);
    this.submitAttempted.set(false);
    this.isFormModalOpen.set(true);
  }

  openEditModal(item: ScheduleTemplate): void {
    this.editingItem.set(item);
    this.formStablishmentId.set(item.stablishment.id);
    this.formDoctorUuid.set(item.doctor?.uuid ?? '');
    this.formDayOfWeek.set(item.dayOfWeek);
    this.formStartTime.set(this.toHm(item.startTime));
    this.formEndTime.set(this.toHm(item.endTime));
    this.formSlotIntervalMinutes.set(String(item.slotIntervalMinutes));
    this.formValidFrom.set(item.validFrom);
    this.formValidUntil.set(item.validUntil ?? '');
    this.formError.set(null);
    this.submitAttempted.set(false);
    this.isFormModalOpen.set(true);
    
    // Load doctors for this establishment
    this.loadFormDoctors(item.stablishment.id);
    
    // Load services: if a doctor is assigned, load their services, else load establishment's services
    if (item.doctor?.uuid) {
      this.formServicesLoading.set(true);
      this.doctorApi.getById(item.doctor.uuid).subscribe({
        next: (doc) => {
          this.formServices.set(doc.services || []);
          this.formServiceId.set(item.servicio.id);
          this.formServicesLoading.set(false);
        },
        error: () => this.formServicesLoading.set(false)
      });
    } else {
      this.loadFormServices(item.stablishment.id);
      this.formServiceId.set(item.servicio.id);
    }
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.editingItem.set(null);
    this.formServices.set([]);
    this.formDoctors.set([]);
  }

  onFormStablishmentChange(value: string): void {
    const stablishmentId = value ? Number(value) : null;
    this.formStablishmentId.set(stablishmentId);
    this.formDoctorUuid.set('');
    this.formServiceId.set(null);
    this.formServices.set([]);
    this.formDoctors.set([]);
    
    if (stablishmentId != null) {
      this.loadFormDoctors(stablishmentId);
      this.loadFormServices(stablishmentId);
    }
  }

  onFormDoctorChange(doctorUuid: string): void {
    this.formDoctorUuid.set(doctorUuid);
    this.formServiceId.set(null);
    this.formServices.set([]);
    
    if (doctorUuid) {
      this.formServicesLoading.set(true);
      this.doctorApi.getById(doctorUuid).subscribe({
        next: (doc) => {
          this.formServices.set(doc.services || []);
          this.formServicesLoading.set(false);
        },
        error: () => this.formServicesLoading.set(false)
      });
    } else if (this.formStablishmentId() != null) {
      this.loadFormServices(this.formStablishmentId()!);
    }
  }

  onFormServiceChange(value: string): void {
    this.formServiceId.set(value ? Number(value) : null);
  }

  onFormDayOfWeekChange(value: string): void {
    this.formDayOfWeek.set(value as DayOfWeek | '');
  }

  onFormStartTimeInput(event: Event): void {
    this.formStartTime.set((event.target as HTMLInputElement).value);
  }

  onFormEndTimeInput(event: Event): void {
    this.formEndTime.set((event.target as HTMLInputElement).value);
  }

  onFormSlotIntervalInput(event: Event): void {
    this.formSlotIntervalMinutes.set((event.target as HTMLInputElement).value);
  }

  onFormValidFromInput(event: Event): void {
    this.formValidFrom.set((event.target as HTMLInputElement).value);
  }

  onFormValidUntilInput(event: Event): void {
    this.formValidUntil.set((event.target as HTMLInputElement).value);
  }

  private buildPayload(): ScheduleTemplateWrite {
    const doctorUuid = this.formDoctorUuid();
    return {
      stablishment: { id: this.formStablishmentId()! },
      servicio: { id: this.formServiceId()! },
      doctor: doctorUuid ? { uuid: doctorUuid } : null,
      dayOfWeek: this.formDayOfWeek() as DayOfWeek,
      startTime: this.toHms(this.formStartTime()),
      endTime: this.toHms(this.formEndTime()),
      slotIntervalMinutes: Number(this.formSlotIntervalMinutes()),
      validFrom: this.formValidFrom(),
      validUntil: this.formValidUntil() || null,
    };
  }

  onSubmit(): void {
    this.submitAttempted.set(true);
    if (!this.formValid()) {
      return;
    }

    const payload = this.buildPayload();
    this.formLoading.set(true);
    this.formError.set(null);

    const editing = this.editingItem();
    const request = editing ? this.api.update(editing.id, payload) : this.api.create(payload);

    request.subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeFormModal();
        this.loadPage(this.data()?.number ?? 0);

        // Generar horarios automáticamente usando los parámetros de la plantilla
        const fromDate = payload.validFrom;
        // Si no tiene fecha de fin, limitamos la autogeneración a 1 mes para evitar errores
        let toDate = payload.validUntil;
        if (!toDate) {
          const d = new Date(fromDate);
          d.setMonth(d.getMonth() + 1);
          toDate = localIsoDate(d);
        }
        
        const doctorId = payload.doctor?.uuid;

        this.scheduleApi.generateSchedulesFromTemplates({
          stablishmentId: payload.stablishment.id,
          serviceId: payload.servicio.id,
          ...(doctorId ? { doctorId } : {}),
          from: fromDate,
          to: toDate
        }).subscribe({
          next: (schedules) => {
             // Opcional: mostrar un mensaje de éxito. Usamos el de generate para mostrar algo si está abierto,
             // o simplemente usar un alert (el usuario pidió que sea automático).
             alert(`Plantilla guardada y se autogeneraron ${schedules.length} horario(s) desde ${fromDate} hasta ${toDate}.`);
          },
          error: (err) => {
             console.error('Error autogenerando horarios', err);
             alert('Se guardó la plantilla pero hubo un error al autogenerar los horarios. Tal vez ya existían o es un día festivo.');
          }
        });
      },
      error: (err) => {
        this.formLoading.set(false);
        this.formError.set(
          this.describeWriteError(err, editing ? 'Ocurrió un error al actualizar la plantilla.' : 'Ocurrió un error al crear la plantilla.'),
        );
      },
    });
  }

  // --- Modal Eliminar ---
  openDeleteModal(item: ScheduleTemplate): void {
    this.deletingItem.set(item);
    this.formError.set(null);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.deletingItem.set(null);
  }

  confirmDelete(): void {
    const item = this.deletingItem();
    if (!item) return;

    this.formLoading.set(true);
    this.formError.set(null);

    this.api.delete(item.id).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeDeleteModal();
        this.loadPage(this.data()?.number ?? 0);
      },
      error: (err) => {
        this.formLoading.set(false);
        this.formError.set(this.describeWriteError(err, 'Ocurrió un error al eliminar la plantilla.'));
      },
    });
  }

  // --- Modal Generar Horarios desde Plantillas ---
  openGenerateModal(): void {
    const today = localIsoDate();
    this.genStablishmentId.set(null);
    this.genServiceId.set(null);
    this.genDoctorUuid.set('');
    this.genServices.set([]);
    this.genDoctors.set([]);
    this.genFrom.set(today);
    this.genTo.set(today);
    this.generateError.set(null);
    this.generateSuccessMessage.set(null);
    this.isGenerateModalOpen.set(true);
  }

  closeGenerateModal(): void {
    this.isGenerateModalOpen.set(false);
  }

  private loadGenDoctors(stablishmentId: number): void {
    this.genDoctorsLoading.set(true);
    fetchAllPages((page) => this.establishmentApi.getDoctors(stablishmentId, page, 100)).subscribe({
      next: ({ items }) => {
        this.genDoctors.set(items);
        this.genDoctorsLoading.set(false);
      },
      error: () => {
        this.genDoctorsLoading.set(false);
      },
    });
  }

  private loadGenServices(stablishmentId: number): void {
    this.genServicesLoading.set(true);
    fetchAllPages((page) => this.establishmentApi.getServices(stablishmentId, page, 100)).subscribe({
      next: ({ items }) => {
        this.genServices.set(items);
        this.genServicesLoading.set(false);
      },
      error: () => {
        this.genServicesLoading.set(false);
      },
    });
  }

  onGenStablishmentChange(value: string): void {
    const stablishmentId = value ? Number(value) : null;
    this.genStablishmentId.set(stablishmentId);
    this.genDoctorUuid.set('');
    this.genServiceId.set(null);
    this.genServices.set([]);
    this.genDoctors.set([]);
    
    if (stablishmentId != null) {
      this.loadGenDoctors(stablishmentId);
      this.loadGenServices(stablishmentId);
    }
  }

  onGenDoctorChange(doctorUuid: string): void {
    this.genDoctorUuid.set(doctorUuid);
    this.genServiceId.set(null);
    this.genServices.set([]);
    
    if (doctorUuid) {
      this.genServicesLoading.set(true);
      this.doctorApi.getById(doctorUuid).subscribe({
        next: (doc) => {
          this.genServices.set(doc.services || []);
          this.genServicesLoading.set(false);
        },
        error: () => this.genServicesLoading.set(false)
      });
    } else if (this.genStablishmentId() != null) {
      this.loadGenServices(this.genStablishmentId()!);
    }
  }

  onGenServiceChange(value: string): void {
    this.genServiceId.set(value ? Number(value) : null);
  }

  onGenFromInput(event: Event): void {
    this.genFrom.set((event.target as HTMLInputElement).value);
  }

  onGenToInput(event: Event): void {
    this.genTo.set((event.target as HTMLInputElement).value);
  }

  onGenerateSubmit(): void {
    if (!this.genValid()) {
      return;
    }

    const doctorId = this.genDoctorUuid();

    this.generateLoading.set(true);
    this.generateError.set(null);
    this.generateSuccessMessage.set(null);

    this.scheduleApi
      .generateSchedulesFromTemplates({
        stablishmentId: this.genStablishmentId()!,
        serviceId: this.genServiceId()!,
        ...(doctorId ? { doctorId } : {}),
        from: this.genFrom(),
        to: this.genTo(),
      })
      .subscribe({
        next: (schedules) => {
          this.generateLoading.set(false);
          this.generateSuccessMessage.set(`Se generaron ${schedules.length} horario(s) para el período seleccionado.`);
        },
        error: (err) => {
          this.generateLoading.set(false);
          this.generateError.set(extractApiErrorMessage(err, 'No se pudieron generar los horarios desde las plantillas.'));
        },
      });
  }
}
