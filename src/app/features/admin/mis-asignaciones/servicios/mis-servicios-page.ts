import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServicioApiService } from '../../../../core/api/servicio-api.service';
import { ScheduleApiService } from '../../../../core/api/schedule-api.service';
import type { Servicio, Establishment, ScheduleDTO } from '../../../../core/models';
import { Icon } from '../../../../shared/ui/atoms/icon/icon';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-mis-servicios-page',
  standalone: true,
  imports: [CommonModule, Icon],
  templateUrl: './mis-servicios-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisServiciosPage implements OnInit {
  private readonly servicioApi = inject(ServicioApiService);
  private readonly scheduleApi = inject(ScheduleApiService);

  protected readonly loading = signal(true);
  protected readonly services = signal<Servicio[]>([]);
  protected readonly establishments = signal<Establishment[]>([]);
  
  protected readonly isCreatingSchedule = signal(false);
  protected readonly selectedService = signal<Servicio | null>(null);
  protected readonly selectedEstablishment = signal<Establishment | null>(null);

  protected readonly mySchedules = signal<ScheduleDTO[]>([]);
  protected readonly schedulesLoading = signal(false);

  // New schedule form
  protected readonly newScheduleDate = signal<string>('');
  protected readonly newScheduleTime = signal<string>('');
  protected readonly formLoading = signal(false);
  protected readonly formError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    
    let loadedCount = 0;
    const checkDone = () => {
      loadedCount++;
      if (loadedCount === 2) {
        this.loading.set(false);
      }
    };

    this.servicioApi.getMyServices().subscribe({
      next: (services) => this.services.set(services),
      error: () => this.services.set([]),
      complete: checkDone
    });

    this.servicioApi.getMyStablishments().subscribe({
      next: (est) => this.establishments.set(est),
      error: () => this.establishments.set([]),
      complete: checkDone
    });
  }

  protected readonly filterDate = signal<string>('');
  protected readonly currentPage = signal(0);
  protected readonly hasMore = signal(true);

  protected openScheduleModal(service: Servicio, establishment: Establishment): void {
    this.selectedService.set(service);
    this.selectedEstablishment.set(establishment);
    this.newScheduleDate.set('');
    this.newScheduleTime.set('');
    this.formError.set(null);
    this.isCreatingSchedule.set(true);
    this.filterDate.set('');
    this.loadMySchedules(true);
  }

  protected closeScheduleModal(): void {
    this.isCreatingSchedule.set(false);
    this.selectedService.set(null);
    this.selectedEstablishment.set(null);
  }

  protected onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    // Si el usuario ha scrolleado hasta casi el final, cargamos más
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 20) {
      this.loadMySchedules(false);
    }
  }

  protected loadMySchedules(reset: boolean = false): void {
    const srv = this.selectedService();
    const est = this.selectedEstablishment();
    if (!srv || !est) return;

    if (reset) {
      this.currentPage.set(0);
      this.hasMore.set(true);
      this.mySchedules.set([]);
    }

    if (!this.hasMore() || this.schedulesLoading()) return;

    this.schedulesLoading.set(true);
    
    const params: any = { 
        stablishmentId: est.id, 
        serviceId: srv.id, 
        page: this.currentPage(), 
        size: 15 // load 15 at a time
    };
    if (this.filterDate()) {
        params.date = this.filterDate();
    }

    this.scheduleApi.getMySchedules(params).subscribe({
      next: (page) => {
        if (reset) {
            this.mySchedules.set(page.content);
        } else {
            this.mySchedules.set([...this.mySchedules(), ...page.content]);
        }
        this.hasMore.set(!page.last);
        this.currentPage.update(p => p + 1);
        this.schedulesLoading.set(false);
      },
      error: () => {
        this.schedulesLoading.set(false);
      }
    });
  }

  protected markAsUnavailable(scheduleId: number): void {
    this.scheduleApi.updateMyScheduleStatus(scheduleId, 'STATUS_UNAVAILABLE').subscribe({
      next: () => {
        this.loadMySchedules(true);
      },
      error: (err) => {
        const errorMsg = err.error?.message || err.message || 'Error al actualizar el estado.';
        alert(errorMsg);
      }
    });
  }

  protected createSchedule(): void {
    if (!this.newScheduleDate() || !this.newScheduleTime()) {
        this.formError.set('La fecha y hora son obligatorias.');
        return;
    }
    const srv = this.selectedService();
    const est = this.selectedEstablishment();
    if (!srv || !est) return;

    this.formLoading.set(true);
    this.formError.set(null);
    
    // Add seconds to time string because backend expects HH:mm:ss
    const timeWithSeconds = this.newScheduleTime().length === 5 ? this.newScheduleTime() + ':00' : this.newScheduleTime();

    this.scheduleApi.createMySchedule({
        date: this.newScheduleDate(),
        hour: timeWithSeconds,
        doctor: { uuid: '00000000-0000-0000-0000-000000000000' }, // Backend will overwrite this with the real UUID
        service: { id: srv.id },
        stablishment: { id: est.id }
    }).subscribe({
        next: () => {
            this.formLoading.set(false);
            this.newScheduleDate.set('');
            this.newScheduleTime.set('');
            this.loadMySchedules(true);
        },
        error: (err) => {
            this.formLoading.set(false);
            this.formError.set(err.error?.message || err.message || 'Error al crear horario.');
        }
    });
  }
}
