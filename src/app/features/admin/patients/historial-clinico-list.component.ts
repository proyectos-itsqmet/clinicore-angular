import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { SelectField, type SelectOption } from '../../../shared/ui/molecules/select-field/select-field';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { EncounterApiService } from '../../../core/api/encounter-api.service';
import { PatientApiService } from '../../../core/api/patient-api.service';
import { TurnApiService } from '../../../core/api/turn-api.service';
import { fetchAllPages } from '../../../core/api/fetch-all-pages.util';
import { extractApiErrorMessage, formatIsoDateEs, isPermissionDeniedError } from '../metrics-shared/turn-status.util';
import type { Encounter, EncounterCreate, Page, Patient, Turn } from '../../../core/models';

/**
 * app-historial-clinico-list — "pacientes/historial-clinico"
 * (`GET/POST /api/patients/{patientId}/encounters` + `PUT /api/encounters/{id}`).
 *
 * No delete anywhere: `EncounterController` has no `@DeleteMapping` — a
 * clinical record is a legal document. Creation is deliberately NOT a blank
 * form: it requires picking one of the patient's OWN `TURN_TREATED` turns
 * (fetched via the existing `GET /api/turns/patient/{id}?status=TURN_TREATED`,
 * reused as-is — no new backend surface needed), matching
 * `EncounterService#create`'s own rule. `turnId` is still sent on an edit
 * (read-only in that mode) because `EncounterDTO.turnId` is `@NotNull` on
 * BOTH create and update, even though `EncounterService#update` never reads
 * it — see `EncounterCreate`.
 */
@Component({
  selector: 'app-historial-clinico-list',
  imports: [ReactiveFormsModule, RouterLink, SelectField],
  templateUrl: './historial-clinico-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialClinicoListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly encounterApi = inject(EncounterApiService);
  private readonly patientApi = inject(PatientApiService);
  private readonly turnApi = inject(TurnApiService);
  private readonly fb = inject(FormBuilder);

  private pendingTurnId: number | null = null;

  protected readonly patientId = signal<string | null>(null);
  protected readonly patient = signal<Patient | null>(null);

  protected readonly patientSearchForm = this.fb.nonNullable.group({ name: [''], ci: [''] });
  protected readonly patientResults = signal<Patient[]>([]);
  protected readonly patientSearchLoading = signal<boolean>(false);
  protected readonly patientSearchError = signal<string | null>(null);
  protected readonly patientSearchAttempted = signal<boolean>(false);

  protected readonly data = signal<Page<Encounter> | null>(null);
  protected readonly loading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);

  protected readonly isCreateModalOpen = signal<boolean>(false);
  protected readonly isEditModalOpen = signal<boolean>(false);
  protected readonly editingItem = signal<Encounter | null>(null);
  protected readonly formLoading = signal<boolean>(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly treatedTurns = signal<Turn[]>([]);

  /**
   * Los turnos atendidos, como opciones.
   *
   * El número de turno y la fecha van de etiqueta; el doctor al renglón de
   * apoyo. En una sola línea con tres separadores, el nombre del médico — que
   * es justamente lo que distingue dos turnos del mismo día — era lo primero
   * que se cortaba con puntos suspensivos.
   */
  protected readonly treatedTurnOptions = computed<readonly SelectOption[]>(() =>
    this.treatedTurns().map((t) => {
      const schedule = t.schedule;
      const when = `${schedule?.date ?? ''} ${schedule?.hour ?? ''}`.trim();
      const doctor = `${schedule?.doctor?.firstName ?? ''} ${schedule?.doctor?.lastName ?? ''}`.trim();
      return {
        value: String(t.id),
        label: when ? `Turno #${t.order} · ${when}` : `Turno #${t.order}`,
        hint: doctor ? `Dr. ${doctor}` : undefined,
      };
    }),
  );
  protected readonly treatedTurnsLoading = signal<boolean>(false);
  protected readonly treatedTurnsIncomplete = signal<boolean>(false);

  protected readonly form = this.fb.nonNullable.group({
    turnId: ['', Validators.required],
    reasonForVisit: ['', Validators.required],
    diagnosis: ['', Validators.required],
    clinicalNotes: [''],
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const patientId = params.get('patientId');
    const turnId = params.get('turnId');
    this.pendingTurnId = turnId ? Number(turnId) : null;

    if (patientId) {
      this.patientId.set(patientId);
      this.patientApi.getById(patientId).subscribe({
        next: (p) => this.patient.set(p),
        error: () => this.patient.set(null),
      });
      this.loadPage(0);
    }
  }

  // --- Selección de paciente ---
  searchPatients(): void {
    const { name, ci } = this.patientSearchForm.getRawValue();
    if (!name.trim() && !ci.trim()) {
      return;
    }

    this.patientSearchLoading.set(true);
    this.patientSearchError.set(null);
    this.patientSearchAttempted.set(true);

    this.patientApi.getAll(name.trim() || undefined, ci.trim() || undefined, 0, 10).subscribe({
      next: (page) => {
        this.patientResults.set(page.content ?? []);
        this.patientSearchLoading.set(false);
      },
      error: (err) => {
        this.patientSearchError.set(extractApiErrorMessage(err, 'No se pudo buscar pacientes.'));
        this.patientSearchLoading.set(false);
      },
    });
  }

  selectPatient(p: Patient): void {
    this.patient.set(p);
    this.patientId.set(p.uuid);
    this.patientResults.set([]);
    this.loadPage(0);
  }

  clearPatient(): void {
    this.patient.set(null);
    this.patientId.set(null);
    this.data.set(null);
    this.error.set(null);
    this.patientResults.set([]);
    this.patientSearchAttempted.set(false);
    this.patientSearchForm.reset({ name: '', ci: '' });
  }

  // --- Listado ---
  loadPage(page: number): void {
    const patientId = this.patientId();
    if (!patientId) return;

    this.loading.set(true);
    this.error.set(null);

    this.encounterApi.getHistoryForPatient(patientId, page, 10).subscribe({
      next: (pageData) => {
        this.data.set(pageData);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.describeError(err, 'No se pudo cargar el historial clínico.'));
        this.loading.set(false);
      },
    });
  }

  formatVisitDate(date?: string): string {
    return date ? formatIsoDateEs(date) : '-';
  }

  private describeError(err: unknown, fallback: string): string {
    const message = extractApiErrorMessage(err, fallback);
    if (isPermissionDeniedError(err, message)) {
      return `${message} Solo el doctor tratante de este registro o un administrador pueden acceder.`;
    }
    return message;
  }

  // --- Modal Crear ---
  openCreateModal(): void {
    const patientId = this.patientId();
    if (!patientId) return;

    this.form.reset({ turnId: '', reasonForVisit: '', diagnosis: '', clinicalNotes: '' });
    this.formError.set(null);
    this.isCreateModalOpen.set(true);
    this.loadTreatedTurns(patientId);
  }

  private loadTreatedTurns(patientId: string): void {
    this.treatedTurnsLoading.set(true);
    this.treatedTurnsIncomplete.set(false);

    fetchAllPages((page) =>
      this.turnApi.getTurnsByPatient(patientId, { status: 'TURN_TREATED', page, size: 20 }),
    ).subscribe({
      next: ({ items, complete }) => {
        this.treatedTurns.set(items);
        this.treatedTurnsIncomplete.set(!complete);
        this.treatedTurnsLoading.set(false);

        if (this.pendingTurnId != null && items.some((t) => t.id === this.pendingTurnId)) {
          this.form.patchValue({ turnId: String(this.pendingTurnId) });
        }
        this.pendingTurnId = null;
      },
      error: () => {
        this.treatedTurns.set([]);
        this.treatedTurnsLoading.set(false);
      },
    });
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  onCreateSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { turnId, reasonForVisit, diagnosis, clinicalNotes } = this.form.getRawValue();
    const payload: EncounterCreate = {
      turnId: Number(turnId),
      reasonForVisit,
      diagnosis,
      ...(clinicalNotes ? { clinicalNotes } : {}),
    };

    this.formLoading.set(true);
    this.formError.set(null);

    this.encounterApi.create(payload).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeCreateModal();
        this.loadPage(0);
      },
      error: (err) => {
        this.formLoading.set(false);
        this.formError.set(this.describeError(err, 'Ocurrió un error al registrar la historia clínica.'));
      },
    });
  }

  // --- Modal Editar ---
  openEditModal(item: Encounter): void {
    this.editingItem.set(item);
    this.form.reset({
      turnId: String(item.turnId),
      reasonForVisit: item.reasonForVisit,
      diagnosis: item.diagnosis,
      clinicalNotes: item.clinicalNotes ?? '',
    });
    this.formError.set(null);
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingItem.set(null);
  }

  onEditSubmit(): void {
    const item = this.editingItem();
    if (!item || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { turnId, reasonForVisit, diagnosis, clinicalNotes } = this.form.getRawValue();
    const payload: EncounterCreate = {
      turnId: Number(turnId) || item.turnId,
      reasonForVisit,
      diagnosis,
      ...(clinicalNotes ? { clinicalNotes } : {}),
    };

    this.formLoading.set(true);
    this.formError.set(null);

    this.encounterApi.update(item.id, payload).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeEditModal();
        this.loadPage(this.data()?.number ?? 0);
      },
      error: (err) => {
        this.formLoading.set(false);
        this.formError.set(this.describeError(err, 'Ocurrió un error al actualizar la historia clínica.'));
      },
    });
  }
}
