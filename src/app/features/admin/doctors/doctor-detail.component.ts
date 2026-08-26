import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DoctorApiService } from '../../../core/api/doctor-api.service';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { ServicioApiService } from '../../../core/api/servicio-api.service';
import { ConsultorioApiService } from '../../../core/api/consultorio-api.service';
import { ScheduleTemplateApiService } from '../../../core/api/schedule-template-api.service';
import type {
  AdminDoctor,
  Consultorio,
  Establishment,
  Page,
  ScheduleTemplate,
  ScheduleTemplateWrite,
  Servicio,
} from '../../../core/models';

@Component({
  selector: 'app-doctor-detail',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, DecimalPipe],
  templateUrl: './doctor-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly doctorApi = inject(DoctorApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly servicioApi = inject(ServicioApiService);
  private readonly consultorioApi = inject(ConsultorioApiService);
  private readonly scheduleTemplateApi = inject(ScheduleTemplateApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly doctor = signal<AdminDoctor | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  // Modales
  protected readonly isEditModalOpen = signal<boolean>(false);
  protected readonly isDeleteModalOpen = signal<boolean>(false);
  protected readonly isAssignEstModalOpen = signal<boolean>(false);
  protected readonly isAssignServiceModalOpen = signal<boolean>(false);
  protected readonly formLoading = signal<boolean>(false);

  // Búsqueda y Asignación de Establecimientos al Doctor
  protected readonly candidateEstName = signal<string>('');
  protected readonly candidateEstablishments = signal<Page<Establishment> | null>(null);
  protected readonly candidateEstLoading = signal<boolean>(false);
  protected readonly candidateEstPage = signal<number>(0);
  protected readonly assigningEstId = signal<number | null>(null);
  protected readonly assignEstSuccess = signal<string | null>(null);
  protected readonly assignEstError = signal<string | null>(null);

  // Búsqueda y Asignación de Servicios al Doctor
  protected readonly candidateServiceName = signal<string>('');
  protected readonly candidateServices = signal<Page<Servicio> | null>(null);
  protected readonly candidateServiceLoading = signal<boolean>(false);
  protected readonly candidateServicePage = signal<number>(0);
  protected readonly assigningServiceId = signal<number | null>(null);
  protected readonly assignServiceSuccess = signal<string | null>(null);
  protected readonly assignServiceError = signal<string | null>(null);

  // Formularios
  // --- Consultorios por jornada ------------------------------------------
  //
  // The room is NOT a property of the doctor: `Doctor.stablishments` is a
  // many-to-many, so "Consultorio 3" only means something inside one site.
  // It lives on the schedule template, which already carries site + service +
  // doctor + weekday + hours. That is why this card lists SHIFTS rather than
  // offering a single field: the same doctor can be in room 3 on Mondays and
  // room 5 on Wednesdays.
  /** Backend sends DayOfWeek as its uppercase English enum name. */
  protected readonly DAY_LABELS: Record<string, string> = { MONDAY: 'Lunes', TUESDAY: 'Martes', WEDNESDAY: 'Miércoles', THURSDAY: 'Jueves', FRIDAY: 'Viernes', SATURDAY: 'Sábado', SUNDAY: 'Domingo' };
  protected readonly doctorTemplates = signal<ScheduleTemplate[]>([]);
  protected readonly templatesLoading = signal<boolean>(true);
  protected readonly templatesError = signal<string | null>(null);
  /** Rooms keyed by establishment id: each shift only offers its own site rooms. */
  protected readonly consultoriosByEst = signal<Record<number, Consultorio[]>>({});
  protected readonly savingTemplateId = signal<number | null>(null);
  protected readonly consultorioFeedback = signal<{ kind: 'success' | 'error'; text: string } | null>(null);

  protected readonly editForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    speciality: ['', Validators.required],
    gender: ['GENDER_MALE', Validators.required],
    ci: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]]
  });

  private doctorId: string = '';

  ngOnInit(): void {
    this.doctorId = this.route.snapshot.paramMap.get('id') || '';
    if (this.doctorId) {
      this.loadDoctor();
    } else {
      this.error.set('Identificador de doctor no válido');
      this.loading.set(false);
    }
  }

  /** The doctor shifts, so an admin can set the room for each one. */
  loadDoctorTemplates(): void {
    const uuid = this.doctor()?.uuid;
    if (!uuid) {
      this.templatesLoading.set(false);
      return;
    }

    this.templatesLoading.set(true);
    this.templatesError.set(null);

    // size 100: a doctor has a handful of weekly shifts, not a paginated list.
    this.scheduleTemplateApi.getAll(0, 100, { doctorId: uuid }).subscribe({
      next: (page) => {
        this.doctorTemplates.set(page.content ?? []);
        this.loadConsultoriosForTemplates(page.content ?? []);
        this.templatesLoading.set(false);
      },
      error: () => {
        this.templatesError.set('No pudimos cargar las jornadas de este doctor.');
        this.templatesLoading.set(false);
      },
    });
  }

  /** One request per DISTINCT site, not per shift: several shifts share a site. */
  private loadConsultoriosForTemplates(templates: ScheduleTemplate[]): void {
    const estIds = [
      ...new Set(templates.map((t) => t.stablishment?.id).filter((id): id is number => id != null)),
    ];

    for (const estId of estIds) {
      this.consultorioApi.getByEstablishment(estId).subscribe({
        next: (rooms) => this.consultoriosByEst.update((map) => ({ ...map, [estId]: rooms })),
        // A site with no rooms yet is not an error: the select stays empty and
        // the board shows the turn without a room until an admin loads them.
        error: () => this.consultoriosByEst.update((map) => ({ ...map, [estId]: [] })),
      });
    }
  }

  protected roomsFor(template: ScheduleTemplate): Consultorio[] {
    const estId = template.stablishment?.id;
    return estId == null ? [] : (this.consultoriosByEst()[estId] ?? []);
  }

  /**
   * Saves the room for one shift. Sends the WHOLE template back because
   * `PUT /api/schedule-templates/{id}` replaces it: omitting a field would
   * blank it out rather than leave it alone.
   */
  protected onConsultorioChange(template: ScheduleTemplate, rawValue: string): void {
    const consultorioId = rawValue ? Number(rawValue) : null;

    const payload: ScheduleTemplateWrite = {
      stablishment: { id: template.stablishment.id },
      servicio: { id: template.servicio.id },
      doctor: template.doctor?.uuid ? { uuid: template.doctor.uuid } : null,
      consultorio: consultorioId == null ? null : { id: consultorioId },
      dayOfWeek: template.dayOfWeek,
      startTime: template.startTime,
      endTime: template.endTime,
      slotIntervalMinutes: template.slotIntervalMinutes,
      validFrom: template.validFrom,
      validUntil: template.validUntil ?? null,
    };

    this.savingTemplateId.set(template.id);
    this.consultorioFeedback.set(null);

    this.scheduleTemplateApi.update(template.id, payload).subscribe({
      next: (updated) => {
        this.doctorTemplates.update((list) => list.map((t) => (t.id === updated.id ? updated : t)));
        this.savingTemplateId.set(null);
        this.consultorioFeedback.set({ kind: 'success', text: 'Consultorio actualizado.' });
      },
      error: (err) => {
        this.savingTemplateId.set(null);
        this.consultorioFeedback.set({
          kind: 'error',
          text: err?.error?.error || err?.error?.message || 'No pudimos guardar el consultorio.',
        });
      },
    });
  }

  loadDoctor(): void {
    this.loading.set(true);
    this.error.set(null);
    this.doctorApi.getById(this.doctorId).subscribe({
      next: (doc) => {
        this.doctor.set(doc);
        this.loading.set(false);
        // Needs the uuid, so it can only run once the doctor is in hand.
        this.loadDoctorTemplates();
      },
      error: () => {
        this.error.set('No se pudo cargar la información del doctor.');
        this.loading.set(false);
      }
    });
  }

  // --- Modal Editar ---
  openEditModal(): void {
    const doc = this.doctor();
    if (!doc) return;

    this.editForm.patchValue({
      email: doc.email,
      firstName: doc.firstName,
      lastName: doc.lastName,
      speciality: doc.speciality,
      gender: doc.gender,
      ci: doc.ci
    });
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
  }

  onEditSubmit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.formLoading.set(true);
    const payload = this.editForm.getRawValue();

    this.doctorApi.update(this.doctorId, payload).subscribe({
      next: (updatedDoc) => {
        this.formLoading.set(false);
        this.closeEditModal();
        this.doctor.set(updatedDoc);
        alert('Información del doctor actualizada correctamente.');
      },
      error: () => {
        this.formLoading.set(false);
        alert('Error al actualizar la información del doctor.');
      }
    });
  }

  // --- Modal Eliminar Doctor ---
  openDeleteModal(): void {
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
  }

  confirmDelete(): void {
    this.formLoading.set(true);
    this.doctorApi.delete(this.doctorId).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeDeleteModal();
        alert('Doctor eliminado correctamente.');
        this.router.navigate(['/admin/administracion/doctores']);
      },
      error: (err) => {
        this.formLoading.set(false);
        // El backend ahora rechaza el borrado con un motivo claro (p. ej. turnos
        // reservados asociados) — mostrar ESE mensaje, no uno genérico, es el
        // punto de esta tarea.
        const msg = err?.error?.message || err?.error?.error || 'Error al eliminar el doctor.';
        alert(msg);
        this.closeDeleteModal();
      }
    });
  }

  // --- Modal Asignar Establecimiento al Doctor ---
  openAssignEstModal(): void {
    this.candidateEstName.set('');
    this.candidateEstablishments.set(null);
    this.assignEstSuccess.set(null);
    this.assignEstError.set(null);
    this.isAssignEstModalOpen.set(true);
    this.searchCandidateEst(0);
  }

  closeAssignEstModal(): void {
    this.isAssignEstModalOpen.set(false);
  }

  searchCandidateEst(page: number = 0): void {
    this.candidateEstLoading.set(true);
    this.candidateEstPage.set(page);
    this.assignEstSuccess.set(null);
    this.assignEstError.set(null);

    const name = this.candidateEstName().trim() || undefined;

    this.establishmentApi.getAll(page, 5, name).subscribe({
      next: (data) => {
        this.candidateEstablishments.set(data);
        this.candidateEstLoading.set(false);
      },
      error: () => {
        this.candidateEstLoading.set(false);
        this.assignEstError.set('Error al consultar establecimientos.');
      }
    });
  }

  resetCandidateEstSearch(): void {
    this.candidateEstName.set('');
    this.searchCandidateEst(0);
  }

  onAssignEst(est: Establishment): void {
    if (!est.id) return;
    this.assigningEstId.set(est.id);
    this.assignEstSuccess.set(null);
    this.assignEstError.set(null);

    this.doctorApi.assignToStablishment(this.doctorId, est.id).subscribe({
      next: () => {
        this.assigningEstId.set(null);
        this.assignEstSuccess.set(`Sede "${est.name}" asignada correctamente.`);
        this.loadDoctor();
      },
      error: (err) => {
        this.assigningEstId.set(null);
        const msg = err?.error?.message || err?.error?.Message || 'No se pudo asignar el establecimiento.';
        this.assignEstError.set(msg);
      }
    });
  }

  // --- Modal Asignar Servicio al Doctor ---
  openAssignServiceModal(): void {
    this.candidateServiceName.set('');
    this.candidateServices.set(null);
    this.assignServiceSuccess.set(null);
    this.assignServiceError.set(null);
    this.isAssignServiceModalOpen.set(true);
    this.searchCandidateServices(0);
  }

  closeAssignServiceModal(): void {
    this.isAssignServiceModalOpen.set(false);
  }

  searchCandidateServices(page: number = 0): void {
    this.candidateServiceLoading.set(true);
    this.candidateServicePage.set(page);
    this.assignServiceSuccess.set(null);
    this.assignServiceError.set(null);

    const name = this.candidateServiceName().trim() || undefined;

    this.servicioApi.getAll(page, 5, name).subscribe({
      next: (data) => {
        this.candidateServices.set(data);
        this.candidateServiceLoading.set(false);
      },
      error: () => {
        this.candidateServiceLoading.set(false);
        this.assignServiceError.set('Error al consultar servicios.');
      }
    });
  }

  resetCandidateServiceSearch(): void {
    this.candidateServiceName.set('');
    this.searchCandidateServices(0);
  }

  onAssignService(srv: Servicio): void {
    if (!srv.id) return;
    this.assigningServiceId.set(srv.id);
    this.assignServiceSuccess.set(null);
    this.assignServiceError.set(null);

    this.doctorApi.assignToService(this.doctorId, srv.id).subscribe({
      next: () => {
        this.assigningServiceId.set(null);
        this.assignServiceSuccess.set(`Servicio "${srv.name}" asignado correctamente.`);
        this.loadDoctor();
      },
      error: (err) => {
        this.assigningServiceId.set(null);
        const msg = err?.error?.message || err?.error?.Message || 'No se pudo asignar el servicio al doctor.';
        this.assignServiceError.set(msg);
      }
    });
  }

  onRevokeEst(est: Establishment): void {
    if (!est.id) return;
    if (!confirm(`¿Estás seguro de desasignar la sede "${est.name}"?`)) return;

    this.doctorApi.revokeStablishment(this.doctorId, est.id).subscribe({
      next: () => {
        alert('Sede desasignada exitosamente.');
        this.loadDoctor();
      },
      error: () => {
        alert('Error al desasignar la sede.');
      }
    });
  }

  onRevokeService(srv: Servicio): void {
    if (!srv.id) return;
    if (!confirm(`¿Estás seguro de desasignar el servicio "${srv.name}"?`)) return;

    this.doctorApi.revokeService(this.doctorId, srv.id).subscribe({
      next: () => {
        alert('Servicio desasignado exitosamente.');
        this.loadDoctor();
      },
      error: () => {
        alert('Error al desasignar el servicio.');
      }
    });
  }
}
