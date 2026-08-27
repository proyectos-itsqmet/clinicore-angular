import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { SelectField, type SelectOption } from '../../../shared/ui/molecules/select-field/select-field';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { EncounterApiService } from '../../../core/api/encounter-api.service';
import { PatientApiService } from '../../../core/api/patient-api.service';
import { PrescriptionApiService } from '../../../core/api/prescription-api.service';
import { fetchAllPages } from '../../../core/api/fetch-all-pages.util';
import { extractApiErrorMessage, formatIsoDateEs, isPermissionDeniedError } from '../metrics-shared/turn-status.util';
import type { Encounter, Page, Patient, Prescription, PrescriptionCreate, PrescriptionItem } from '../../../core/models';

/**
 * app-receta-list — "pacientes/recetas"
 * (`GET /api/patients/{patientId}/prescriptions` + `POST /api/prescriptions`).
 *
 * A `Prescription` is IMMUTABLE once issued — `PrescriptionController` has
 * no `@PutMapping`/`@DeleteMapping` at all. This screen therefore has NO
 * "Editar" action anywhere: only "Ver detalle" (read-only) and, from that
 * detail, "Emitir corrección" — which opens the SAME create form pre-filled
 * with the original's items, but submits as a brand-new
 * `POST /api/prescriptions`, never an update of the old record. Creation
 * always requires picking an EXISTING `Encounter` for this patient — never a
 * bare `encounterId` text field — mirroring how `historial-clinico` requires
 * picking an existing treated turn.
 */
@Component({
  selector: 'app-receta-list',
  imports: [ReactiveFormsModule, RouterLink, SelectField],
  templateUrl: './receta-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecetaListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly patientApi = inject(PatientApiService);
  private readonly prescriptionApi = inject(PrescriptionApiService);
  private readonly encounterApi = inject(EncounterApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly patientId = signal<string | null>(null);
  protected readonly patient = signal<Patient | null>(null);

  protected readonly patientSearchForm = this.fb.nonNullable.group({ name: [''], ci: [''] });
  protected readonly patientResults = signal<Patient[]>([]);
  protected readonly patientSearchLoading = signal<boolean>(false);
  protected readonly patientSearchError = signal<string | null>(null);
  protected readonly patientSearchAttempted = signal<boolean>(false);

  protected readonly data = signal<Page<Prescription> | null>(null);
  protected readonly loading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);

  protected readonly isCreateModalOpen = signal<boolean>(false);
  protected readonly isDetailModalOpen = signal<boolean>(false);
  protected readonly viewingItem = signal<Prescription | null>(null);
  protected readonly isCorrection = signal<boolean>(false);
  protected readonly formLoading = signal<boolean>(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly encountersForPicker = signal<Encounter[]>([]);

  /**
   * Las consultas como opciones del desplegable.
   *
   * La fecha va de etiqueta y el motivo con el doctor de `hint`, en lugar de
   * una sola linea con tres separadores: en una lista angosta esa linea se
   * cortaba con puntos suspensivos justo en el nombre del medico, que es lo
   * que distingue dos consultas del mismo dia.
   */
  protected readonly encounterOptions = computed<readonly SelectOption[]>(() =>
    this.encountersForPicker().map((e) => ({
      value: String(e.id),
      // `visitDate` es opcional en el modelo. Sin respaldo, una consulta sin
      // fecha rendereaba una opcion SIN etiqueta: una fila en blanco que se
      // puede elegir y que no dice a que consulta corresponde.
      label: e.visitDate ?? `Consulta #${e.id}`,
      hint: `${e.reasonForVisit} · Dr. ${e.doctorFullName}`,
    })),
  );
  protected readonly encountersLoading = signal<boolean>(false);
  protected readonly encountersIncomplete = signal<boolean>(false);

  protected readonly form = this.fb.nonNullable.group({
    encounterId: ['', Validators.required],
    notes: [''],
    items: this.fb.array([this.createItemGroup()]),
  });

  ngOnInit(): void {
    const patientId = this.route.snapshot.queryParamMap.get('patientId');
    if (patientId) {
      this.patientId.set(patientId);
      this.patientApi.getById(patientId).subscribe({
        next: (p) => this.patient.set(p),
        error: () => this.patient.set(null),
      });
      this.loadPage(0);
    }
  }

  private createItemGroup(prefill?: PrescriptionItem) {
    return this.fb.nonNullable.group({
      medication: [prefill?.medication ?? '', Validators.required],
      dosage: [prefill?.dosage ?? '', Validators.required],
      frequency: [prefill?.frequency ?? '', Validators.required],
      duration: [prefill?.duration ?? '', Validators.required],
      instructions: [prefill?.instructions ?? ''],
    });
  }

  protected get itemsArray(): FormArray {
    return this.form.controls.items;
  }

  addItem(): void {
    this.itemsArray.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  // --- Selección de paciente ---
  searchPatients(): void {
    const { name, ci } = this.patientSearchForm.getRawValue();
    if (!name.trim() && !ci.trim()) return;

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

    this.prescriptionApi.getHistoryForPatient(patientId, page, 10).subscribe({
      next: (pageData) => {
        this.data.set(pageData);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.describeError(err, 'No se pudo cargar las recetas.'));
        this.loading.set(false);
      },
    });
  }

  formatIssuedDate(createdAt?: string): string {
    return createdAt ? formatIsoDateEs(createdAt.slice(0, 10)) : '-';
  }

  private describeError(err: unknown, fallback: string): string {
    const message = extractApiErrorMessage(err, fallback);
    if (isPermissionDeniedError(err, message)) {
      return `${message} Solo el doctor tratante de este registro o un administrador pueden acceder.`;
    }
    return message;
  }

  // --- Modal Ver Detalle ---
  openDetailModal(item: Prescription): void {
    this.viewingItem.set(item);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.viewingItem.set(null);
  }

  // --- Modal Crear / Emitir Corrección ---
  /** `prefillFrom` set = "Emitir corrección": same encounter + a copy of the old items, submitted as a brand-new record. */
  openCreateModal(prefillFrom?: Prescription): void {
    const patientId = this.patientId();
    if (!patientId) return;

    this.isCorrection.set(!!prefillFrom);
    this.formError.set(null);

    this.itemsArray.clear();
    const seedItems = prefillFrom?.items?.length ? prefillFrom.items : [undefined];
    for (const item of seedItems) {
      this.itemsArray.push(this.createItemGroup(item));
    }

    // patchValue only touches the keys given — the FormArray we just rebuilt
    // above is left untouched (unlike `reset()`, which would also cascade
    // into every FormArray child and clear the values back to null).
    this.form.patchValue({
      encounterId: prefillFrom ? String(prefillFrom.encounterId) : '',
      notes: prefillFrom?.notes ?? '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();

    this.isDetailModalOpen.set(false);
    this.isCreateModalOpen.set(true);
    this.loadEncountersForPicker(patientId);
  }

  private loadEncountersForPicker(patientId: string): void {
    this.encountersLoading.set(true);
    this.encountersIncomplete.set(false);
    fetchAllPages((page) => this.encounterApi.getHistoryForPatient(patientId, page, 20)).subscribe({
      next: ({ items, complete }) => {
        this.encountersForPicker.set(items);
        this.encountersIncomplete.set(!complete);
        this.encountersLoading.set(false);
      },
      error: () => {
        this.encountersForPicker.set([]);
        this.encountersLoading.set(false);
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

    const raw = this.form.getRawValue();
    const payload: PrescriptionCreate = {
      encounterId: Number(raw.encounterId),
      items: raw.items.map((it) => ({
        medication: it.medication,
        dosage: it.dosage,
        frequency: it.frequency,
        duration: it.duration,
        instructions: it.instructions || '',
      })),
      ...(raw.notes ? { notes: raw.notes } : {}),
    };

    this.formLoading.set(true);
    this.formError.set(null);

    this.prescriptionApi.create(payload).subscribe({
      next: () => {
        this.formLoading.set(false);
        this.closeCreateModal();
        this.loadPage(0);
      },
      error: (err) => {
        this.formLoading.set(false);
        this.formError.set(this.describeError(err, 'Ocurrió un error al registrar la receta.'));
      },
    });
  }
}
