import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { MisTurnosPage } from './mis-turnos-page';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import type { Page, Servicio, Turn, TurnStatus } from '../../../../core/models';

const TURNS_URL = '/api/turns';
const MY_SERVICES_URL = '/api/services/my-services';

/**
 * Tests del panel del médico (`/admin/mis-asignaciones/turnos`).
 *
 * La página llegó sin ninguno. Estos cubren lo que le faltaba para ser usable
 * en consulta: el check-in, que era el ÚNICO paso de la máquina de estados sin
 * botón — un turno "Pendiente" no tenía forma de avanzar desde acá y el médico
 * dependía de que alguien lo moviera desde el panel de operador — y el ticket,
 * que es el número que el paciente escucha y que esta pantalla mostraba como un
 * simple contador.
 */
function servicio(id: number): Servicio {
  return { id, name: `Servicio ${id}`, price: 30 } as Servicio;
}

function turn(id: number, status: TurnStatus, overrides: Partial<Turn> = {}): Turn {
  return {
    id,
    order: id,
    status,
    createdAt: '2026-08-27T10:00:00Z',
    patient: { uuid: `p-${id}`, email: `p${id}@t.com`, firstName: 'Ana', lastName: 'Pérez', ci: '0102030405' },
    schedule: { date: '2026-08-27', hour: '09:30' },
    ...overrides,
  } as Turn;
}

function page<T>(content: T[]): Page<T> {
  return {
    content,
    empty: content.length === 0,
    first: true,
    last: true,
    number: 0,
    numberOfElements: content.length,
    size: 100,
    totalElements: content.length,
    totalPages: 1,
  } as Page<T>;
}

describe('MisTurnosPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // El componente se suscribe a un topic por servicio al iniciar. Sin un
        // doble, `subscribeTopic` abriría un SockJS real dentro del test.
        {
          provide: RealtimeService,
          useValue: { status: signal('closed'), subscribeTopic: () => of() },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /** Monta la página y drena la cascada servicios -> turnos. */
  function create(turns: Turn[] = []) {
    const fixture = TestBed.createComponent(MisTurnosPage);
    fixture.detectChanges();

    httpMock.expectOne((req) => req.url === MY_SERVICES_URL).flush([servicio(1)]);
    httpMock.expectOne((req) => req.url === TURNS_URL).flush(page(turns));

    fixture.detectChanges();
    return fixture;
  }

  it('lets the doctor check a patient in, which is the step that had no button', () => {
    // `markAsInTreatment` exige TURN_WAITNG (TurnService.java:335), así que sin
    // check-in un turno "Pendiente" no podía avanzar desde esta pantalla: el
    // médico tenía que pedirle a recepción que lo moviera para poder llamarlo.
    const fixture = create([turn(1, 'TURN_PENDING')]);
    const component = fixture.componentInstance;

    expect(component.canMarkWaiting(turn(1, 'TURN_PENDING'))).toBe(true);
    expect(component.canMarkWaiting(turn(2, 'TURN_WAITNG'))).toBe(false);
    expect(component.canMarkWaiting(turn(3, 'TURN_IN_TREATMENT'))).toBe(false);
    expect(component.canMarkWaiting(turn(4, 'TURN_TREATED'))).toBe(false);
    expect(component.canMarkWaiting(turn(5, 'TURN_CANCELLED'))).toBe(false);
  });

  it('PUTs /waiting and refetches so the row moves on its own', () => {
    const fixture = create([turn(7, 'TURN_PENDING')]);

    fixture.componentInstance.markAsWaiting(turn(7, 'TURN_PENDING'));

    const req = httpMock.expectOne(`${TURNS_URL}/7/waiting`);
    expect(req.request.method).toBe('PUT');
    req.flush(turn(7, 'TURN_WAITNG'));

    // Vuelve a pedir la lista: el estado que muestra la fila tiene que salir
    // del servidor, no de una suposición del cliente sobre lo que pasó.
    httpMock.expectOne((r) => r.url === TURNS_URL).flush(page([turn(7, 'TURN_WAITNG')]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('En sala de espera');
  });

  it('surfaces the backend rejection instead of failing silently', () => {
    const fixture = create([turn(8, 'TURN_PENDING')]);

    fixture.componentInstance.markAsWaiting(turn(8, 'TURN_PENDING'));

    httpMock.expectOne(`${TURNS_URL}/8/waiting`).flush(
      { message: 'Solo se puede registrar el ingreso de un turno que está pendiente' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Solo se puede registrar el ingreso');
  });

  it('shows the ticket the patient hears, not the internal counter', () => {
    // La fila mostraba `order` — un 1, 2, 3… que el paciente no escucha nunca.
    // El orden se cuenta por servicio y por fecha, así que otro paciente en
    // otro consultorio también es el 3 hoy.
    const fixture = create([turn(3, 'TURN_WAITNG', { ticket: 'H-003' })]);

    expect(fixture.nativeElement.textContent).toContain('H-003');
  });

  it('falls back to the order when the backend sent no ticket', () => {
    const fixture = create([turn(4, 'TURN_WAITNG')]);

    expect(fixture.nativeElement.textContent).toContain('4');
    expect(fixture.nativeElement.textContent).not.toContain('undefined');
  });
});
