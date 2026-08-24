import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PatientApiService } from '../../../core/api/patient-api.service';
import { TurnApiService } from '../../../core/api/turn-api.service';
import { ScheduleApiService } from '../../../core/api/schedule-api.service';
import { EstablishmentApiService } from '../../../core/api/establishment-api.service';
import type { Page, Patient, Turn, TurnFilterParams, TurnStatus, ScheduleDTO, Establishment } from '../../../core/models';

@Component({
  selector: 'app-patient-detail',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './patient-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly patientApi = inject(PatientApiService);
  private readonly turnApi = inject(TurnApiService);
  private readonly scheduleApi = inject(ScheduleApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly fb = inject(FormBuilder);

  protected patientId = '';
  protected readonly patient = signal<Patient | null>(null);
  protected readonly patientLoading = signal<boolean>(true);

  // Turnos del paciente
  protected readonly turnsData = signal<Page<Turn> | null>(null);
  protected readonly turnsLoading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  protected readonly filterForm = this.fb.nonNullable.group({
    status: [''],
    from: [''],
    to: [''],
    sort: ['createdAt,desc']
  });

  // Modal para Asignar Turno
  protected readonly isAssignTurnModalOpen = signal<boolean>(false);
  protected readonly schedulesData = signal<Page<ScheduleDTO> | null>(null);
  protected readonly schedulesLoading = signal<boolean>(false);
  protected readonly schedulesError = signal<string | null>(null);
  protected readonly selectedSchedule = signal<ScheduleDTO | null>(null);
  protected readonly assigningTurn = signal<boolean>(false);

  // Catálogo de establecimientos para filtrar
  protected readonly establishments = signal<Establishment[]>([]);
  protected readonly establishmentsLoading = signal<boolean>(false);

  // Formulario de búsqueda de horarios
  protected readonly scheduleSearchForm = this.fb.nonNullable.group({
    date: [''],
    stablishmentId: [''],
    doctorName: ['']
  });

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('id') || '';
    if (this.patientId) {
      this.loadPatientInfo();
      this.loadTurns(0);
    } else {
      this.error.set('Identificador de paciente no válido.');
      this.turnsLoading.set(false);
      this.patientLoading.set(false);
    }
  }

  loadPatientInfo(): void {
    this.patientLoading.set(true);
    this.patientApi.getById(this.patientId).subscribe({
      next: (data) => {
        this.patient.set(data);
        this.patientLoading.set(false);
      },
      error: () => {
        this.patientLoading.set(false);
      }
    });
  }

  loadTurns(page: number): void {
    this.turnsLoading.set(true);
    this.error.set(null);

    const formValues = this.filterForm.getRawValue();

    const params: TurnFilterParams = {
      status: formValues.status || undefined,
      from: formValues.from || undefined,
      to: formValues.to || undefined,
      sort: formValues.sort || undefined,
      page,
      size: 10
    };

    this.turnApi.getTurnsByPatient(this.patientId, params).subscribe({
      next: (pageData) => {
        this.turnsData.set(pageData);
        if (!this.patient() && pageData.content.length > 0 && pageData.content[0].patient) {
          this.patient.set(pageData.content[0].patient);
        }
        this.turnsLoading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los turnos del paciente.');
        this.turnsLoading.set(false);
      }
    });
  }

  onFilterSubmit(): void {
    this.loadTurns(0);
  }

  onFilterReset(): void {
    this.filterForm.reset({
      status: '',
      from: '',
      to: '',
      sort: 'createdAt,desc'
    });
    this.loadTurns(0);
  }

  // --- Lógica del Modal Asignar Turno ---

  openAssignTurnModal(): void {
    this.selectedSchedule.set(null);
    this.schedulesError.set(null);
    this.scheduleSearchForm.reset({
      date: '',
      stablishmentId: '',
      doctorName: ''
    });
    this.isAssignTurnModalOpen.set(true);

    if (this.establishments().length === 0) {
      this.establishmentsLoading.set(true);
      this.establishmentApi.getAll(0, 100).subscribe({
        next: (page) => {
          this.establishments.set(page.content);
          this.establishmentsLoading.set(false);
        },
        error: () => {
          this.establishmentsLoading.set(false);
        }
      });
    }

    this.loadSchedules(0);
  }

  closeAssignTurnModal(): void {
    this.isAssignTurnModalOpen.set(false);
    this.selectedSchedule.set(null);
  }

  loadSchedules(page: number): void {
    this.schedulesLoading.set(true);
    this.schedulesError.set(null);

    const values = this.scheduleSearchForm.getRawValue();
    const stablishmentIdNum = values.stablishmentId ? Number(values.stablishmentId) : undefined;

    this.scheduleApi.getAll({
      date: values.date || undefined,
      stablishmentId: stablishmentIdNum,
      doctorName: values.doctorName || undefined,
      page,
      size: 6
    }).subscribe({
      next: (pageData) => {
        this.schedulesData.set(pageData);
        this.schedulesLoading.set(false);
      },
      error: () => {
        this.schedulesError.set('No se pudieron cargar los horarios disponibles.');
        this.schedulesLoading.set(false);
      }
    });
  }

  onScheduleSearch(): void {
    this.loadSchedules(0);
  }

  onScheduleSearchReset(): void {
    this.scheduleSearchForm.reset({
      date: '',
      stablishmentId: '',
      doctorName: ''
    });
    this.loadSchedules(0);
  }

  selectSchedule(schedule: ScheduleDTO): void {
    if (schedule.status === 'STATUS_OCCUPIED' || schedule.status === 'STATUS_UNAVAILABLE') {
      return;
    }
    this.selectedSchedule.set(schedule);
  }

  confirmAssignTurn(): void {
    const selected = this.selectedSchedule();
    if (!selected || !selected.id) {
      alert('Por favor selecciona un horario disponible.');
      return;
    }

    this.assigningTurn.set(true);
    const payload = {
      schedule: {
        id: selected.id
      },
      patient: {
        uuid: this.patientId
      }
    };

    this.turnApi.createByStaff(payload).subscribe({
      next: (createdTurn) => {
        this.assigningTurn.set(false);
        this.closeAssignTurnModal();
        alert(`¡Turno #${createdTurn.order ?? ''} asignado exitosamente al paciente!`);
        this.loadTurns(0);
      },
      error: (err) => {
        this.assigningTurn.set(false);
        const msg = err?.error?.message || err?.error?.error || 'Error al asignar el turno al paciente.';
        alert(msg);
      }
    });
  }

  // --- Utilidades de Estado y Badges ---

  getStatusBadgeClass(status: TurnStatus | string): string {
    switch (status) {
      case 'TURN_PENDING':
        return 'bg-amber-50 text-amber-700 ring-amber-600/20';
      case 'TURN_WAITNG':
        return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'TURN_IN_TREATMENT':
        return 'bg-purple-50 text-purple-700 ring-purple-600/20';
      case 'TURN_TREATED':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
      case 'TURN_CANCELLED':
        return 'bg-rose-50 text-rose-700 ring-rose-600/20';
      default:
        return 'bg-slate-50 text-slate-700 ring-slate-600/20';
    }
  }

  getStatusLabel(status: TurnStatus | string): string {
    switch (status) {
      case 'TURN_PENDING':
        return 'Pendiente';
      case 'TURN_WAITNG':
        return 'En Espera';
      case 'TURN_IN_TREATMENT':
        return 'En Atención';
      case 'TURN_TREATED':
        return 'Atendido';
      case 'TURN_CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  }

  getScheduleStatusBadgeClass(status?: string): string {
    switch (status) {
      case 'STATUS_FREE':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
      case 'STATUS_OCCUPIED':
        return 'bg-rose-50 text-rose-700 ring-rose-600/20';
      case 'STATUS_UNAVAILABLE':
        return 'bg-slate-100 text-slate-600 ring-slate-500/20';
      default:
        return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
    }
  }

  getScheduleStatusLabel(status?: string): string {
    switch (status) {
      case 'STATUS_FREE':
        return 'Disponible';
      case 'STATUS_OCCUPIED':
        return 'Ocupado';
      case 'STATUS_UNAVAILABLE':
        return 'No disponible';
      default:
        return 'Disponible';
    }
  }
}
