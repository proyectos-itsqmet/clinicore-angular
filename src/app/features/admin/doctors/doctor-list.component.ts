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
import { RouterLink } from '@angular/router';

import { DoctorApiService } from '../../../core/api/doctor-api.service';
import { SpecialityApiService } from '../../../core/api/speciality-api.service';
import type { AdminDoctor, Speciality } from '../../../core/models';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Pill } from '../../../shared/ui/atoms/pill/pill';
import { DataTable, type TableColumn } from '../../../shared/ui/molecules/data-table/data-table';
import { ErrorState } from '../../../shared/ui/molecules/error-state/error-state';
import { InlineAlert } from '../../../shared/ui/molecules/inline-alert/inline-alert';
import { InputField } from '../../../shared/ui/molecules/input-field/input-field';
import { Modal } from '../../../shared/ui/molecules/modal/modal';
import { PageHeader } from '../../../shared/ui/molecules/page-header/page-header';
import { Pagination } from '../../../shared/ui/molecules/pagination/pagination';
import { SelectField } from '../../../shared/ui/molecules/select-field/select-field';
import { GENDER_OPTIONS, NO_SPECIALITY } from '../doctors-shared';
import { createAdminListStore } from '../admin-list-store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'name', label: 'Doctor', emphasis: true },
  { key: 'ci', label: 'Cédula' },
  { key: 'speciality', label: 'Especialidad' },
  { key: 'email', label: 'Correo' },
  { key: 'actions', label: 'Acciones', align: 'end', hiddenLabel: true },
];

/**
 * app-doctor-list — the doctors section: paginated table plus the dialog that
 * registers a new one. Editing and assignment live on the detail page, one
 * click away.
 *
 * Same shape as `app-establishment-list`; read that component's doc for the
 * dialog and failure-channel decisions.
 *
 * THE ROW'S ACTION IS A ROUTER LINK, NOT AN `app-button`. The atom renders an
 * `<a href>` when given one, which is a full document load — it would throw away
 * the whole SPA and re-authenticate. `app-button` has no router-aware mode
 * today (nor does `app-card`), so the link is written out here with the same
 * recipe as `variant="quiet" size="sm"`, hoisted into one constant so the copy
 * exists exactly once. Flagged as a real gap in `molecules/README.md`: the fix
 * is a `routerLink` branch in the atom, not a second copy of this string.
 */
@Component({
  selector: 'app-doctor-list',
  imports: [
    Button,
    DataTable,
    ErrorState,
    Icon,
    InlineAlert,
    InputField,
    Modal,
    PageHeader,
    Pagination,
    Pill,
    ReactiveFormsModule,
    RouterLink,
    SelectField,
  ],
  templateUrl: './doctor-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class DoctorListComponent implements OnInit {
  private readonly api = inject(DoctorApiService);
  private readonly specialityApi = inject(SpecialityApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly columns = COLUMNS;
  protected readonly genderOptions = GENDER_OPTIONS;
  protected readonly rowKey = (row: AdminDoctor) => row.uuid;

  /** The `app-button` `quiet`/`sm` recipe, for the one link the atom can't render. */
  protected readonly detailLinkClasses =
    'relative inline-flex min-h-11 items-center justify-center gap-2.5 rounded-pill px-[18px] ' +
    'font-sans text-[14.5px] font-bold text-ink-2 no-underline transition-all duration-150 ease-brand ' +
    'hover:bg-field hover:text-ink active:translate-y-px';

  protected readonly messages = {
    firstName: { required: 'El nombre es obligatorio.' },
    lastName: { required: 'El apellido es obligatorio.' },
    email: { required: 'El correo es obligatorio.' },
    password: { required: 'La contraseña es obligatoria.' },
    speciality: { required: 'La especialidad es obligatoria.' },
    gender: { required: 'Selecciona un género.' },
    ci: { required: 'La cédula es obligatoria.', pattern: 'Debe tener 10 dígitos numéricos.' },
  } as const;

  protected readonly list = createAdminListStore<AdminDoctor>({
    destroyRef: this.destroyRef,
    load: (page) => this.api.getAll(page, 10),
  });

  protected readonly dialogOpen = signal(false);

  private readonly specialities = signal<readonly Speciality[]>([]);
  protected readonly specialitiesLoading = signal(false);

  /** Sin catalogo cargado, el formulario cae al texto libre de siempre. */
  protected readonly hasCatalog = computed(() => this.specialities().length > 0);

  protected readonly specialityOptions = computed(() => [
    { value: NO_SPECIALITY, label: 'Selecciona una especialidad' },
    ...this.specialities().map((item) => ({ value: item.id, label: item.name })),
  ]);

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    ci: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    speciality: ['', Validators.required],
    specialityId: [NO_SPECIALITY],
    gender: ['GENDER_MALE', Validators.required],
  });

  ngOnInit(): void {
    this.list.loadPage(0);
    this.loadSpecialities();

    // Elegir del catálogo ESCRIBE el nombre en el control de texto. Así el
    // campo obligatorio queda satisfecho sin validadores dinámicos y el payload
    // viaja con el id y el texto diciendo lo mismo — que es exactamente lo que
    // el backend hace de su lado. Ver `doctors-shared.ts`.
    this.form.controls.specialityId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const id = Number(value);
        const match = this.specialities().find((item) => item.id === id);
        if (match) {
          this.form.controls.speciality.setValue(match.name);
        }
      });
  }

  /**
   * El catálogo es OPCIONAL para esta pantalla: si falla o está vacío, el
   * formulario sigue funcionando con texto libre. Por eso el error no se
   * muestra — no hay nada roto que el usuario pueda arreglar.
   */
  private loadSpecialities(): void {
    this.specialitiesLoading.set(true);
    this.specialityApi
      .getActive()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (specialities) => {
          this.specialities.set(specialities);
          this.specialitiesLoading.set(false);
        },
        error: () => this.specialitiesLoading.set(false),
      });
  }
  protected openCreate(): void {
    this.list.resetMessages();
    this.form.reset({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      ci: '',
      speciality: '',
      specialityId: NO_SPECIALITY,
      gender: 'GENDER_MALE',
    });
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    if (!this.list.pending()) {
      this.dialogOpen.set(false);
    }
  }

  protected submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    // El `<select>` devuelve string aunque la opción se bindee numérica, y
    // `specialityId` solo viaja si de verdad se eligió una del catálogo: en 0 el
    // backend usa el texto libre, que es el camino de siempre.
    const specialityId = Number(raw.specialityId);

    this.list.run({
      request$: this.api.create({
        ...raw,
        specialityId: specialityId > NO_SPECIALITY ? specialityId : undefined,
      }),
      success: 'Doctor registrado.',
      failure: 'No pudimos registrar al doctor. Intenta nuevamente.',
      onSuccess: () => this.dialogOpen.set(false),
    });
  }
}
