import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { SpecialityApiService } from '../../../core/api/speciality-api.service';
import type { Speciality } from '../../../core/models';
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
import { createAdminListStore } from '../admin-list-store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'name', label: 'Especialidad', emphasis: true },
  { key: 'description', label: 'Descripción', wrap: true },
  { key: 'doctors', label: 'Doctores', align: 'end' },
  { key: 'state', label: 'Estado' },
  { key: 'actions', label: 'Acciones', align: 'end', hiddenLabel: true },
];

/**
 * app-speciality-list — Admin → Especialidades.
 *
 * ESTE CATÁLOGO EXISTE PARA ARREGLAR UN PROBLEMA CONCRETO, no para tener otra
 * tabla: `Doctor.speciality` es texto libre, así que para la base «Cardiología»,
 * «cardiologia» y «Cardiologia» son tres especialidades distintas. Eso rompe el
 * agrupamiento de Métricas → Empleados y deja esta pantalla sin nada que
 * administrar.
 *
 * LA MIGRACIÓN NO ESTÁ TERMINADA Y LA PANTALLA LO DICE. El formulario de
 * Doctores ya puede elegir del catálogo, y cuando lo hace el backend copia el
 * nombre al campo de texto — así toda escritura nueva queda consistente. Las
 * filas viejas siguen con su texto, y normalizarlas es una tarea de datos:
 * decidir a mano qué fila le corresponde a cada variante. La columna "Doctores"
 * cuenta solo los que YA apuntan al catálogo, que es exactamente el avance de esa
 * migración.
 *
 * DESACTIVA, NO BORRA, y el botón lo dice: hay doctores apuntando a estas filas.
 */
@Component({
  selector: 'app-speciality-list',
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
  ],
  templateUrl: './speciality-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SpecialityListComponent implements OnInit {
  private readonly api = inject(SpecialityApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly columns = COLUMNS;
  protected readonly rowKey = (row: Speciality) => row.id;

  protected readonly messages = {
    name: { required: 'El nombre es obligatorio.' },
  } as const;

  protected readonly list = createAdminListStore<Speciality>({
    destroyRef: this.destroyRef,
    load: (page) => this.api.getAll(page, 10),
  });

  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Speciality | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  ngOnInit(): void {
    this.list.loadPage(0);
  }

  protected openCreate(): void {
    this.list.resetMessages();
    this.editing.set(null);
    this.form.reset({ name: '', description: '' });
    this.dialogOpen.set(true);
  }

  protected openEdit(speciality: Speciality): void {
    this.list.resetMessages();
    this.editing.set(speciality);
    this.form.reset({ name: speciality.name, description: speciality.description ?? '' });
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    if (!this.list.pending()) {
      this.dialogOpen.set(false);
    }
  }

  protected toggleActive(speciality: Speciality): void {
    this.list.resetMessages();
    this.list.run({
      request$: this.api.update(speciality.id, {
        name: speciality.name,
        description: speciality.description,
        active: !speciality.active,
      }),
      success: speciality.active ? 'Especialidad desactivada.' : 'Especialidad reactivada.',
      failure: 'No pudimos cambiar el estado de la especialidad.',
      errorChannel: 'page',
    });
  }

  protected submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const current = this.editing();
    const payload = {
      name: raw.name,
      description: raw.description || undefined,
      active: current ? current.active : true,
    };

    this.list.run({
      request$: current ? this.api.update(current.id, payload) : this.api.create(payload),
      success: current ? 'Especialidad actualizada.' : 'Especialidad creada.',
      failure: 'No pudimos guardar la especialidad. Puede que ya exista una con ese nombre.',
      onSuccess: () => this.dialogOpen.set(false),
    });
  }
}
