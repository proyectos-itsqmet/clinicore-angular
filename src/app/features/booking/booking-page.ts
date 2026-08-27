import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EstablishmentApiService } from '../../core/api/establishment-api.service';
import { ServicioApiService } from '../../core/api/servicio-api.service';
import { TurnApiService } from '../../core/api/turn-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ChatWidget } from '../../shared/ui/organisms/chat-widget/chat-widget';
import type { Establishment, Servicio, AdminDoctor, ScheduleDTO, Turn } from '../../core/models';

export interface ServiceWithDoctors {
  service: Servicio;
  doctors: AdminDoctor[];
}

@Component({
  selector: 'app-booking-page',
  imports: [CommonModule, FormsModule, RouterLink, DecimalPipe, ChatWidget],
  templateUrl: './booking-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingPage implements OnInit {
  private readonly router = inject(Router);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly servicioApi = inject(ServicioApiService);
  private readonly turnApi = inject(TurnApiService);
  protected readonly authService = inject(AuthService);

  // Pasos: 1 = Sede, 2 = Servicio & Doctor, 3 = Horario, 4 = Confirmado
  protected readonly currentStep = signal<number>(1);

  // Paso 1: Establecimientos
  protected readonly establishments = signal<Establishment[]>([]);
  protected readonly establishmentsLoading = signal<boolean>(false);
  protected readonly selectedEstablishment = signal<Establishment | null>(null);
  protected readonly establishmentSearch = signal<string>('');

  // Paso 2: Servicios y Doctores en el establecimiento seleccionado
  protected readonly servicesWithDoctors = signal<ServiceWithDoctors[]>([]);
  protected readonly servicesLoading = signal<boolean>(false);
  protected readonly selectedService = signal<Servicio | null>(null);
  protected readonly selectedDoctor = signal<AdminDoctor | null>(null);

  // Paso 3: Horarios disponibles (STATUS_FREE)
  protected readonly schedules = signal<ScheduleDTO[]>([]);
  protected readonly schedulesLoading = signal<boolean>(false);
  protected readonly selectedSchedule = signal<ScheduleDTO | null>(null);
  protected readonly filterDate = signal<string>('');

  // Paso 4: Confirmación y Reserva
  protected readonly bookingLoading = signal<boolean>(false);
  protected readonly confirmedTurn = signal<Turn | null>(null);
  protected readonly bookingError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadEstablishments();
    this.authService.checkSession().subscribe();
  }

  // --- Cargas de Datos ---
  loadEstablishments(): void {
    this.establishmentsLoading.set(true);
    this.establishmentApi.getAll(0, 50).subscribe({
      next: (page) => {
        this.establishments.set(page.content);
        this.establishmentsLoading.set(false);
      },
      error: () => {
        this.establishmentsLoading.set(false);
      }
    });
  }

  selectEstablishment(est: Establishment): void {
    this.selectedEstablishment.set(est);
    this.selectedService.set(null);
    this.selectedDoctor.set(null);
    this.selectedSchedule.set(null);
    this.currentStep.set(2);
    this.loadServicesForEstablishment(est.id);
  }

  loadServicesForEstablishment(estId: number): void {
    this.servicesLoading.set(true);
    this.establishmentApi.getServices(estId, 0, 50).subscribe({
      next: (page) => {
        const servicesList = page.content;
        const result: ServiceWithDoctors[] = [];

        if (servicesList.length === 0) {
          this.servicesWithDoctors.set([]);
          this.servicesLoading.set(false);
          return;
        }

        let loadedCount = 0;
        servicesList.forEach((serv) => {
          this.servicioApi.getDoctors(serv.id, undefined, 0, 10).subscribe({
            next: (docPage) => {
              result.push({
                service: serv,
                doctors: docPage.content
              });
              loadedCount++;
              if (loadedCount === servicesList.length) {
                this.servicesWithDoctors.set(result);
                this.servicesLoading.set(false);
              }
            },
            error: () => {
              result.push({ service: serv, doctors: [] });
              loadedCount++;
              if (loadedCount === servicesList.length) {
                this.servicesWithDoctors.set(result);
                this.servicesLoading.set(false);
              }
            }
          });
        });
      },
      error: () => {
        this.servicesLoading.set(false);
      }
    });
  }

  selectServiceAndDoctor(serv: Servicio, doc: AdminDoctor | null): void {
    this.selectedService.set(serv);
    this.selectedDoctor.set(doc);
    this.selectedSchedule.set(null);
    this.currentStep.set(3);
    this.loadAvailableSchedules();
  }

  loadAvailableSchedules(): void {
    const serv = this.selectedService();
    const est = this.selectedEstablishment();
    if (!serv || !est) return;

    this.schedulesLoading.set(true);

    const filters: { stablishmentId?: number; date?: string; status?: string } = {
      stablishmentId: est.id,
      status: 'STATUS_FREE'
    };

    if (this.filterDate()) {
      filters.date = this.filterDate();
    }

    this.servicioApi.getSchedules(serv.id, filters, 0, 50).subscribe({
      next: (page) => {
        let content = page.content;
        const doc = this.selectedDoctor();
        if (doc) {
          content = content.filter((sch) => sch.doctor?.uuid === doc.uuid);
        }
        this.schedules.set(content);
        this.schedulesLoading.set(false);
      },
      error: () => {
        this.schedulesLoading.set(false);
      }
    });
  }

  // --- Filtros de Fecha para Horarios ---
  setTodayFilter(): void {
    const today = new Date().toISOString().split('T')[0];
    this.filterDate.set(today);
    this.loadAvailableSchedules();
  }

  setTomorrowFilter(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    this.filterDate.set(tomorrowStr);
    this.loadAvailableSchedules();
  }

  clearDateFilter(): void {
    this.filterDate.set('');
    this.loadAvailableSchedules();
  }

  onDateChange(date: string): void {
    this.filterDate.set(date);
    this.loadAvailableSchedules();
  }

  selectSchedule(sch: ScheduleDTO): void {
    this.selectedSchedule.set(sch);
  }

  // --- Paso 4: Confirmar y Reservar Cita ---
  confirmAndBookTurn(): void {
    const sch = this.selectedSchedule();
    if (!sch || !sch.id) {
      alert('Por favor selecciona un horario disponible.');
      return;
    }

    this.bookingLoading.set(true);
    this.bookingError.set(null);

    const payload: { schedule: { id: number } } = {
      schedule: {
        id: sch.id
      }
    };

    this.turnApi.create(payload).subscribe({
      next: (turn) => {
        this.bookingLoading.set(false);
        this.confirmedTurn.set(turn);
        this.currentStep.set(4);
      },
      error: (err) => {
        this.bookingLoading.set(false);
        if (err.status === 401 || err.status === 403) {
          this.bookingError.set('Tu sesión ha expirado o no estás autenticado. Por favor inicia sesión para agendar tu turno.');
        } else {
          const msg = err?.error?.message || err?.error?.error || 'No se pudo reservar el turno. Puede que el horario ya haya sido tomado.';
          this.bookingError.set(msg);
        }
      }
    });
  }

  goToStep(step: number): void {
    if (step < this.currentStep()) {
      this.currentStep.set(step);
    }
  }

  resetBooking(): void {
    this.selectedEstablishment.set(null);
    this.selectedService.set(null);
    this.selectedDoctor.set(null);
    this.selectedSchedule.set(null);
    this.confirmedTurn.set(null);
    this.bookingError.set(null);
    this.filterDate.set('');
    this.currentStep.set(1);
  }
}
