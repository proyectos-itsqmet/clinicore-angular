import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, type Observable } from 'rxjs';

import { DoctorApiService } from '../../../core/api/doctor-api.service';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import { ServicioApiService } from '../../../core/api/servicio-api.service';
import type { AdminDoctor, Establishment, Servicio } from '../../../core/models';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Pill } from '../../../shared/ui/atoms/pill/pill';
import { Skeleton } from '../../../shared/ui/atoms/skeleton/skeleton';
import { Card } from '../../../shared/ui/molecules/card/card';
import { ErrorState } from '../../../shared/ui/molecules/error-state/error-state';
import { InlineAlert } from '../../../shared/ui/molecules/inline-alert/inline-alert';
import { InputField } from '../../../shared/ui/molecules/input-field/input-field';
import { ListRow } from '../../../shared/ui/molecules/list-row/list-row';
import { Modal } from '../../../shared/ui/molecules/modal/modal';
import { PageHeader } from '../../../shared/ui/molecules/page-header/page-header';
import {
  SelectField,
  type SelectOption,
} from '../../../shared/ui/molecules/select-field/select-field';
import { GENDER_OPTIONS, genderLabel } from '../doctors-shared';

type DoctorDialog = 'edit' | 'assign-establishment' | 'assign-services';

/**
 * app-doctor-detail — one doctor: their data, the sedes they attend, the
 * services they can perform, and the three dialogs that change any of it.
 *
 * WHAT THE ASSIGNMENT PICKERS OFFER IS WHAT IS NOT ASSIGNED YET. Both dialogs
 * subtract the doctor's current relations from the catalogue before rendering
 * it. The version this replaces listed everything, so the most natural mistake
 * on the screen — picking a sede the doctor already has — was one click away and
 * came back as an opaque server error.
 *
 * THE MULTI-SELECT IS `forkJoin` OVER ONE-BY-ONE CALLS because the endpoint
 * takes one service per request. That has a consequence worth stating rather
 * than hiding: it is NOT atomic. If the fourth of five fails, the first three
 * are already saved, so the failure copy says the assignment was partial and the
 * doctor is reloaded either way — the panel then shows what actually landed
 * instead of what was asked for.
 *
 * THE ID COMES FROM `paramMap` ONCE, in `ngOnInit`, and that is a deliberate
 * limit: this route is only ever reached from the list, never from itself, so
 * the component always remounts. Were a "next doctor" link ever added, this has
 * to become a subscription — `withComponentInputBinding()` is already on in
 * `app.config.ts`, so an `input()` would be the cleaner move at that point.
 */
@Component({
  selector: 'app-doctor-detail',
  imports: [
    Button,
    Card,
    CurrencyPipe,
    ErrorState,
    Icon,
    InlineAlert,
    InputField,
    ListRow,
    Modal,
    PageHeader,
    Pill,
    ReactiveFormsModule,
    RouterLink,
    SelectField,
    Skeleton,
  ],
  templateUrl: './doctor-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class DoctorDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly doctorApi = inject(DoctorApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly servicioApi = inject(ServicioApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly genderOptions = GENDER_OPTIONS;
  protected readonly listPath = '/admin/administracion/doctores';

  protected readonly messages = {
    firstName: { required: 'El nombre es obligatorio.' },
    lastName: { required: 'El apellido es obligatorio.' },
    email: { required: 'El correo es obligatorio.' },
    speciality: { required: 'La especialidad es obligatoria.' },
    gender: { required: 'Selecciona un género.' },
    ci: { required: 'La cédula es obligatoria.', pattern: 'Debe tener 10 dígitos numéricos.' },
    establishment: {
      required: 'Selecciona un establecimiento de la lista.',
      min: 'Selecciona un establecimiento de la lista.',
    },
  } as const;

  protected readonly doctor = signal<AdminDoctor | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly notice = signal<string | null>(null);
  protected readonly dialogError = signal<string | null>(null);

  protected readonly dialog = signal<DoctorDialog | null>(null);
  protected readonly pending = signal(false);

  private readonly establishments = signal<readonly Establishment[]>([]);
  protected readonly establishmentsLoading = signal(false);
  private readonly services = signal<readonly Servicio[]>([]);
  protected readonly servicesLoading = signal(false);
  protected readonly selectedServiceIds = signal<readonly number[]>([]);

  private doctorId = '';

  protected readonly fullName = computed(() => {
    const doc = this.doctor();
    return doc ? `${doc.firstName} ${doc.lastName}` : 'Detalle del doctor';
  });

  protected readonly assignedEstablishments = computed(() => this.doctor()?.stablishments ?? []);
  protected readonly assignedServices = computed(() => this.doctor()?.services ?? []);

  /** Cédula, correo, especialidad, género — one array so the grid has one recipe. */
  protected readonly details = computed(() => {
    const doc = this.doctor();
    if (!doc) {
      return [];
    }
    return [
      { label: 'Cédula', value: doc.ci, pill: false },
      { label: 'Correo electrónico', value: doc.email, pill: false },
      { label: 'Especialidad', value: doc.speciality, pill: true },
      { label: 'Género', value: genderLabel(doc.gender), pill: false },
    ];
  });

  /** Only what the doctor does NOT have yet — see the class doc. */
  protected readonly establishmentOptions = computed<readonly SelectOption[]>(() => {
    const assigned = new Set(this.assignedEstablishments().map((item) => item.id));
    return this.establishments()
      .filter((item) => !assigned.has(item.id))
      .map((item) => ({ value: item.id, label: `${item.name} — ${item.address}` }));
  });

  protected readonly assignableServices = computed(() => {
    const assigned = new Set(this.assignedServices().map((item) => item.id));
    return this.services().filter((item) => !assigned.has(item.id));
  });

  protected readonly editForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    ci: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    speciality: ['', Validators.required],
    gender: ['GENDER_MALE', Validators.required],
  });

  protected readonly assignEstablishmentForm = this.fb.nonNullable.group({
    stablishmentId: [0, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.doctorId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.doctorId) {
      this.loadError.set(true);
      this.loading.set(false);
      return;
    }
    this.loadDoctor();
  }

  /**
   * `silent` skips the skeleton. Every reload AFTER a write is silent: the data
   * on screen is still true, and flashing placeholder bars over a page the user
   * was just reading — or worse, behind a dialog that is still open reporting an
   * error — reads as a page that broke.
   */
  protected loadDoctor(silent = false): void {
    if (!silent) {
      this.loading.set(true);
    }
    this.loadError.set(false);

    this.doctorApi
      .getById(this.doctorId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (doctor) => {
          this.doctor.set(doctor);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set(true);
          this.loading.set(false);
        },
      });
  }

  protected openEdit(): void {
    const doc = this.doctor();
    if (!doc) {
      return;
    }

    this.resetMessages();
    this.editForm.reset({
      firstName: doc.firstName,
      lastName: doc.lastName,
      email: doc.email,
      ci: doc.ci,
      speciality: doc.speciality,
      gender: doc.gender,
    });
    this.dialog.set('edit');
  }

  protected openAssignEstablishment(): void {
    this.resetMessages();
    this.assignEstablishmentForm.reset({ stablishmentId: 0 });
    this.dialog.set('assign-establishment');
    this.loadEstablishments();
  }

  protected openAssignServices(): void {
    this.resetMessages();
    this.selectedServiceIds.set([]);
    this.dialog.set('assign-services');
    this.loadServices();
  }

  protected closeDialog(): void {
    if (!this.pending()) {
      this.dialog.set(null);
    }
  }

  protected toggleService(id: number): void {
    this.selectedServiceIds.update((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  protected isServiceSelected(id: number): boolean {
    return this.selectedServiceIds().includes(id);
  }

  protected submitEdit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.run(
      this.doctorApi.update(this.doctorId, this.editForm.getRawValue()),
      'Información del doctor actualizada.',
      'No pudimos actualizar la información. Intenta nuevamente.',
    );
  }

  protected submitAssignEstablishment(): void {
    if (this.assignEstablishmentForm.invalid) {
      this.assignEstablishmentForm.markAllAsTouched();
      return;
    }

    // A `<select>` returns a string even for a numeric option value.
    const establishmentId = Number(this.assignEstablishmentForm.getRawValue().stablishmentId);

    this.run(
      this.doctorApi.assignToStablishment(this.doctorId, establishmentId),
      'Establecimiento asignado.',
      'No pudimos asignar el establecimiento. Intenta nuevamente.',
    );
  }

  protected submitAssignServices(): void {
    const ids = this.selectedServiceIds();
    if (ids.length === 0) {
      this.dialogError.set('Selecciona al menos un servicio.');
      return;
    }

    this.run(
      forkJoin(ids.map((id) => this.doctorApi.assignToService(this.doctorId, id))),
      ids.length === 1 ? 'Servicio asignado.' : `${ids.length} servicios asignados.`,
      // Not atomic, and the copy says so — see the class doc. This is also the
      // one failure worth reloading after: some of the calls may have landed.
      'No pudimos asignar todos los servicios. Revisa la lista: algunos pueden haberse guardado.',
      true,
    );
  }

  private loadEstablishments(): void {
    if (this.establishments().length > 0) {
      return;
    }

    this.establishmentsLoading.set(true);
    this.establishmentApi
      .getAll(0, 100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.establishments.set(page.content);
          this.establishmentsLoading.set(false);
        },
        error: () => {
          this.establishmentsLoading.set(false);
          this.dialogError.set('No pudimos cargar la lista de establecimientos.');
        },
      });
  }

  private loadServices(): void {
    if (this.services().length > 0) {
      return;
    }

    this.servicesLoading.set(true);
    this.servicioApi
      .getAll(0, 100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.services.set(page.content);
          this.servicesLoading.set(false);
        },
        error: () => {
          this.servicesLoading.set(false);
          this.dialogError.set('No pudimos cargar la lista de servicios.');
        },
      });
  }

  private resetMessages(): void {
    this.notice.set(null);
    this.dialogError.set(null);
  }

  /**
   * Same contract as the list sections, with one difference that matters: it
   * RELOADS the doctor instead of trusting the response body. Two of the three
   * writes here are relation endpoints whose payload does not necessarily carry
   * the refreshed `stablishments` / `services` arrays this page renders.
   */
  private run<T>(
    request$: Observable<T>,
    success: string,
    failure: string,
    reloadOnError = false,
  ): void {
    this.pending.set(true);
    this.dialogError.set(null);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.pending.set(false);
        this.dialog.set(null);
        this.notice.set(success);
        this.loadDoctor(true);
      },
      error: () => {
        this.pending.set(false);
        this.dialogError.set(failure);
        if (reloadOnError) {
          this.loadDoctor(true);
        }
      },
    });
  }
}
