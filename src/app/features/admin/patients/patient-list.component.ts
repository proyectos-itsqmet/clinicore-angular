import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';

import { PatientApiService } from '../../../core/api/patient-api.service';
import type { Patient } from '../../../core/models';
import { DataTable, type TableColumn } from '../../../shared/ui/molecules/data-table/data-table';
import { ErrorState } from '../../../shared/ui/molecules/error-state/error-state';
import { InlineAlert } from '../../../shared/ui/molecules/inline-alert/inline-alert';
import { PageHeader } from '../../../shared/ui/molecules/page-header/page-header';
import { Pagination } from '../../../shared/ui/molecules/pagination/pagination';
import { createAdminListStore } from '../admin-list-store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'name', label: 'Paciente', emphasis: true },
  { key: 'ci', label: 'Cédula' },
  { key: 'email', label: 'Correo' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'birthday', label: 'Nacimiento' },
];

/**
 * app-patient-list — Pacientes → Información.
 *
 * SOLO LECTURA, Y NO ES UNA ETAPA INTERMEDIA. El único endpoint de escritura que
 * existe es `PUT /api/patients/me`, que actualiza al paciente DEL TOKEN: sirve
 * para que alguien edite sus propios datos desde la app móvil, no para que un
 * operador edite a otra persona. Poner un botón "Editar" acá que llame a `/me`
 * editaría al operador logueado, que es peor que no tener el botón.
 *
 * Y aunque existiera el endpoint, los datos de IDENTIDAD (nombre, cédula, fecha
 * de nacimiento, sexo) el backend los ignora incluso en `/me`, porque la historia
 * clínica está archivada con ellos. Editarlos es un problema de dominio, no de
 * pantalla.
 *
 * SIN COLUMNA DE DIRECCIÓN NI CONTACTO DE EMERGENCIA aunque el modelo los traiga:
 * una tabla de listado se lee de un vistazo, y esos dos son datos de detalle. Van
 * en una pantalla de detalle cuando exista.
 */
@Component({
  selector: 'app-patient-list',
  imports: [DataTable, DatePipe, ErrorState, InlineAlert, PageHeader, Pagination],
  templateUrl: './patient-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PatientListComponent implements OnInit {
  private readonly api = inject(PatientApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly columns = COLUMNS;
  protected readonly rowKey = (row: Patient) => row.uuid;

  protected readonly list = createAdminListStore<Patient>({
    destroyRef: this.destroyRef,
    load: (page) => this.api.getAll(page, 10),
  });

  ngOnInit(): void {
    this.list.loadPage(0);
  }

  protected fullName(patient: Patient): string {
    return `${patient.firstName} ${patient.lastName}`;
  }
}
