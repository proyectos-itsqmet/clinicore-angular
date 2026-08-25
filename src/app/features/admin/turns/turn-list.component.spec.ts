import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';

import type { Establishment, Page, ScheduleDTO, Servicio, Turn, TurnStatus } from '../../../core/models';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { buildStablishmentTopic, TurnListComponent } from './turn-list.component';

const ESTABLISHMENTS_URL = 'http://localhost:8080/api/stablishments';
const TURNS_URL = 'http://localhost:8080/api/turns';
const SCHEDULES_URL = 'http://localhost:8080/api/schedules';

/**
 * Fakes `RealtimeService` with a `Subject` per topic so tests can simulate
 * an inbound broadcast (`emit`) without ever touching STOMP/SockJS or a
 * real connection. Mirrors only the public surface the component uses.
 */
class FakeRealtimeService {
  readonly status = signal<'connecting' | 'open' | 'closed'>('closed');
  private readonly subjectsByTopic = new Map<string, Subject<unknown>>();

  subscribeTopic(destination: string): Observable<unknown> {
    let subject = this.subjectsByTopic.get(destination);
    if (!subject) {
      subject = new Subject<unknown>();
      this.subjectsByTopic.set(destination, subject);
    }
    return subject.asObservable();
  }

  /** Test helper: simulate the broker delivering a message on a topic. */
  emit(destination: string, payload: unknown = {}): void {
    this.subjectsByTopic.get(destination)?.next(payload);
  }

  /** Test helper: true once something in the component actually subscribed. */
  hasSubscriberFor(destination: string): boolean {
    return (this.subjectsByTopic.get(destination) as Subject<unknown> | undefined)?.observed ?? false;
  }
}

function establishment(id: number): Establishment {
  return { id, name: `Sede ${id}`, address: `Dirección ${id}` };
}

function servicio(id: number): Servicio {
  return { id, name: `Servicio ${id}`, price: 20 };
}

function turn(id: number, status: TurnStatus, overrides: Partial<Turn> = {}): Turn {
  return {
    id,
    order: id,
    status,
    createdAt: '2026-08-24T10:00:00Z',
    patient: { uuid: `pat-${id}`, email: `p${id}@test.com`, firstName: 'Ana', lastName: 'Lopez', ci: '0102030405' },
    schedule: { date: '2026-08-24', hour: '09:00' },
    ...overrides,
  };
}

function page<T>(content: T[], overrides: Partial<Page<T>> = {}): Page<T> {
  return {
    content,
    empty: content.length === 0,
    first: true,
    last: true,
    number: 0,
    numberOfElements: content.length,
    size: 10,
    totalElements: content.length,
    totalPages: 1,
    pageable: {
      offset: 0,
      pageNumber: 0,
      pageSize: 10,
      paged: true,
      unpaged: false,
      sort: { empty: true, sorted: false, unsorted: true },
    },
    sort: { empty: true, sorted: false, unsorted: true },
    ...overrides,
  };
}

type Fixture = ReturnType<typeof TestBed.createComponent<TurnListComponent>>;

describe('TurnListComponent', () => {
  let httpMock: HttpTestingController;
  let fakeRealtime: FakeRealtimeService;

  beforeEach(() => {
    fakeRealtime = new FakeRealtimeService();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RealtimeService, useValue: fakeRealtime },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Boots the component and drains the establishment auto-select cascade (list -> services). */
  function create(estList: Establishment[] = [establishment(1)]): Fixture {
    const fixture = TestBed.createComponent(TurnListComponent);
    fixture.detectChanges();

    httpMock.expectOne((req) => req.url === ESTABLISHMENTS_URL).flush(page(estList));

    if (estList.length > 0) {
      httpMock.expectOne((req) => req.url === `${ESTABLISHMENTS_URL}/${estList[0].id}/services`).flush(page([]));
    }

    fixture.detectChanges();
    return fixture;
  }

  describe('queue transition gating', () => {
    it('only allows check-in (Registrar Ingreso) from TURN_PENDING', () => {
      const fixture = create();
      const component = fixture.componentInstance;

      expect(component.canMarkWaiting(turn(1, 'TURN_PENDING'))).toBe(true);
      expect(component.canMarkWaiting(turn(2, 'TURN_WAITNG'))).toBe(false);
      expect(component.canMarkWaiting(turn(3, 'TURN_IN_TREATMENT'))).toBe(false);
      expect(component.canMarkWaiting(turn(4, 'TURN_TREATED'))).toBe(false);
      expect(component.canMarkWaiting(turn(5, 'TURN_CANCELLED'))).toBe(false);
    });

    it('only allows starting attention (Iniciar Atención) from TURN_WAITNG', () => {
      const fixture = create();
      const component = fixture.componentInstance;

      expect(component.canMarkInTreatment(turn(1, 'TURN_WAITNG'))).toBe(true);
      expect(component.canMarkInTreatment(turn(2, 'TURN_PENDING'))).toBe(false);
      expect(component.canMarkInTreatment(turn(3, 'TURN_IN_TREATMENT'))).toBe(false);
      expect(component.canMarkInTreatment(turn(4, 'TURN_TREATED'))).toBe(false);
    });
  });

  it('renders only the legal queue action per row in the turns modal', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.openTurnModal(servicio(1));
    httpMock
      .expectOne((req) => req.url === TURNS_URL)
      .flush(
        page([
          turn(1, 'TURN_PENDING'),
          turn(2, 'TURN_WAITNG'),
          turn(3, 'TURN_IN_TREATMENT'),
          turn(4, 'TURN_TREATED'),
        ]),
      );
    fixture.detectChanges();

    const rows = Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLTableRowElement[];
    expect(rows.length).toBe(4);

    // NOTE: the status badge for TURN_IN_TREATMENT reads "En Atención", which
    // collides with the bare substring "Atención" — assert on the button's
    // exact "▶ Atención" text (with its icon prefix) to target the ACTION,
    // never the status badge.

    // TURN_PENDING: only check-in + atender are legal, not "iniciar atención"
    expect(rows[0].textContent).toContain('Ingreso');
    expect(rows[0].textContent).toContain('Atender');
    expect(rows[0].textContent).not.toContain('▶ Atención');

    // TURN_WAITNG: check-in already done, both "iniciar atención" and atender are legal
    expect(rows[1].textContent).not.toContain('Ingreso');
    expect(rows[1].textContent).toContain('▶ Atención');
    expect(rows[1].textContent).toContain('Atender');

    // TURN_IN_TREATMENT: only atender remains legal (badge itself reads "En Atención")
    expect(rows[2].textContent).not.toContain('Ingreso');
    expect(rows[2].textContent).not.toContain('▶ Atención');
    expect(rows[2].textContent).toContain('Atender');

    // TURN_TREATED: terminal, no actions at all
    expect(rows[3].textContent).toContain('Finalizado');
    expect(rows[3].textContent).not.toContain('Ingreso');
    expect(rows[3].textContent).not.toContain('▶ Atención');
    expect(rows[3].textContent).not.toContain('Atender');
  });

  it('markTurnWaiting PUTs /waiting and shows success feedback', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.markTurnWaiting(turn(5, 'TURN_PENDING'));

    const req = httpMock.expectOne(`${TURNS_URL}/5/waiting`);
    expect(req.request.method).toBe('PUT');
    req.flush(turn(5, 'TURN_WAITNG'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('registró su ingreso');
    expect(fixture.nativeElement.textContent).toContain('#5');
  });

  it('markTurnWaiting surfaces the backend rejection message on failure', () => {
    const fixture = create();

    fixture.componentInstance.markTurnWaiting(turn(6, 'TURN_WAITNG'));

    httpMock
      .expectOne(`${TURNS_URL}/6/waiting`)
      .flush(
        { error: 'Solo se puede registrar el ingreso de un turno que está pendiente' },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Solo se puede registrar el ingreso de un turno que está pendiente');
  });

  it('markTurnInTreatment PUTs /in-treatment and shows success feedback', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.markTurnInTreatment(turn(8, 'TURN_WAITNG'));

    const req = httpMock.expectOne(`${TURNS_URL}/8/in-treatment`);
    expect(req.request.method).toBe('PUT');
    req.flush(turn(8, 'TURN_IN_TREATMENT'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('inició su atención');
    expect(fixture.nativeElement.textContent).toContain('#8');
  });

  it('marks a turn as treated through a confirmation modal, never window.confirm', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const confirmSpy = vi.spyOn(window, 'confirm');

    component.openMarkTreatedModal(turn(3, 'TURN_IN_TREATMENT'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Marcar Turno #3 como Atendido');
    expect(confirmSpy).not.toHaveBeenCalled();

    component.confirmMarkTreated();
    httpMock.expectOne(`${TURNS_URL}/3/treated`).flush(turn(3, 'TURN_TREATED'));
    fixture.detectChanges();

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Marcar Turno #3 como Atendido');
    expect(fixture.nativeElement.textContent).toContain('ha sido marcado como ATENDIDO');
  });

  it('sets and renders establishmentsError when the establishment list fails to load', () => {
    const fixture = TestBed.createComponent(TurnListComponent);
    fixture.detectChanges();

    httpMock
      .expectOne((req) => req.url === ESTABLISHMENTS_URL)
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los establecimientos disponibles.');
  });

  describe('establishments: complete catalog (no more than one page silently shown)', () => {
    it('fetches a second page when the first reports more than one page, and both stay selectable', () => {
      const fixture = TestBed.createComponent(TurnListComponent);
      fixture.detectChanges();

      const firstPageReq = httpMock.expectOne((req) => req.url === ESTABLISHMENTS_URL);
      expect(firstPageReq.request.params.get('page')).toBe('0');
      firstPageReq.flush(page([establishment(1)], { number: 0, last: false, totalPages: 2, totalElements: 2 }));

      // The old `getAll(0, 100)` never issued this second request — a second
      // sede past the first page used to just vanish from this selector.
      const secondPageReq = httpMock.expectOne((req) => req.url === ESTABLISHMENTS_URL);
      expect(secondPageReq.request.params.get('page')).toBe('1');
      secondPageReq.flush(page([establishment(2)], { number: 1, last: true }));

      httpMock.expectOne((req) => req.url === `${ESTABLISHMENTS_URL}/1/services`).flush(page([]));
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Sede 1');
      expect(text).toContain('Sede 2');
    });
  });

  describe('services per establishment: search + pagination', () => {
    it('reaches the request with the name filter and omits it when empty (never the old hardcoded size 100)', () => {
      const fixture = create();
      const component = fixture.componentInstance;

      component.onServicesFilterChange('Odontología');
      const req = httpMock.expectOne((r) => r.url === `${ESTABLISHMENTS_URL}/1/services`);
      expect(req.request.params.get('name')).toBe('Odontología');
      expect(req.request.params.get('size')).toBe('12');
      req.flush(page([servicio(9)]));
      fixture.detectChanges();

      component.onServicesFilterChange('');
      const secondReq = httpMock.expectOne((r) => r.url === `${ESTABLISHMENTS_URL}/1/services`);
      expect(secondReq.request.params.has('name')).toBe(false);
      secondReq.flush(page([]));
    });

    it('replaces the visible services page instead of appending when paginating', () => {
      const fixture = TestBed.createComponent(TurnListComponent);
      fixture.detectChanges();
      httpMock.expectOne((req) => req.url === ESTABLISHMENTS_URL).flush(page([establishment(1)]));
      httpMock
        .expectOne((req) => req.url === `${ESTABLISHMENTS_URL}/1/services`)
        .flush(page([servicio(1)], { totalPages: 2, totalElements: 13 }));
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.loadServicesForEstablishment(1, 1);
      const req = httpMock.expectOne((r) => r.url === `${ESTABLISHMENTS_URL}/1/services`);
      expect(req.request.params.get('page')).toBe('1');
      req.flush(page([servicio(2)], { number: 1, first: false, last: true, totalPages: 2, totalElements: 13 }));
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).not.toContain('Servicio 1');
      expect(text).toContain('Servicio 2');
    });

    it('resets the search box when switching establishments so a stale filter never silently hides the new sede’s services', () => {
      const est2 = establishment(2);
      const fixture = create([establishment(1), est2]);
      const component = fixture.componentInstance;

      component.onServicesFilterChange('Pediatría');
      httpMock.expectOne((r) => r.url === `${ESTABLISHMENTS_URL}/1/services`).flush(page([]));

      component.selectEstablishment(est2);
      const req = httpMock.expectOne((r) => r.url === `${ESTABLISHMENTS_URL}/2/services`);
      expect(req.request.params.has('name')).toBe(false);
      req.flush(page([]));
      fixture.detectChanges();

      const searchInput = fixture.nativeElement.querySelector(
        'input[placeholder="Buscar servicio por nombre..."]',
      ) as HTMLInputElement;
      expect(searchInput.value).toBe('');
    });
  });

  it('shows the service name on each reassignment candidate slot', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.openReassignModal(turn(4, 'TURN_WAITNG'));

    const candidate: ScheduleDTO = { id: 55, date: '2026-08-25', hour: '10:00', service: servicio(9) };
    httpMock.expectOne((req) => req.url === SCHEDULES_URL).flush(page([candidate]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Servicio 9');
  });

  it('sets and renders reassignError when the reassignment schedule search fails', () => {
    const fixture = create();

    fixture.componentInstance.openReassignModal(turn(4, 'TURN_WAITNG'));

    httpMock
      .expectOne((req) => req.url === SCHEDULES_URL)
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los horarios disponibles para reasignar.');
  });

  describe('realtime auto-refresh', () => {
    const today = new Date().toISOString().split('T')[0];

    it('refetches the current page exactly once when an inbound realtime signal arrives', () => {
      const fixture = create(); // establishment(1) auto-selected, today by default
      const component = fixture.componentInstance;

      component.openTurnModal(servicio(1));
      httpMock.expectOne((req) => req.url === TURNS_URL).flush(page([turn(1, 'TURN_PENDING')]));
      fixture.detectChanges();

      fakeRealtime.emit(buildStablishmentTopic(1, today));

      // A single inbound signal must cause exactly one refetch: `expectOne`
      // below fails if zero or more than one request went out, and the
      // suite-wide `afterEach(() => httpMock.verify())` would fail if a
      // second, unflushed request were left outstanding.
      httpMock.expectOne((req) => req.url === TURNS_URL).flush(page([turn(1, 'TURN_WAITNG')]));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('En Espera');
    });

    it('resubscribes to the new topic when the selected establishment changes', () => {
      const est2 = establishment(2);
      const fixture = create([establishment(1), est2]);
      const component = fixture.componentInstance;
      const topic1 = buildStablishmentTopic(1, today);
      const topic2 = buildStablishmentTopic(2, today);

      expect(fakeRealtime.hasSubscriberFor(topic1)).toBe(true);

      component.selectEstablishment(est2);
      httpMock.expectOne((req) => req.url === `${ESTABLISHMENTS_URL}/2/services`).flush(page([]));
      fixture.detectChanges();

      expect(fakeRealtime.hasSubscriberFor(topic1)).toBe(false);
      expect(fakeRealtime.hasSubscriberFor(topic2)).toBe(true);
    });

    it('resubscribes to the new topic when the selected date changes', () => {
      const fixture = create();
      const component = fixture.componentInstance;
      const tomorrow = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      })();
      const topicToday = buildStablishmentTopic(1, today);
      const topicTomorrow = buildStablishmentTopic(1, tomorrow);

      expect(fakeRealtime.hasSubscriberFor(topicToday)).toBe(true);

      component.onDateChange(tomorrow);
      fixture.detectChanges();

      expect(fakeRealtime.hasSubscriberFor(topicToday)).toBe(false);
      expect(fakeRealtime.hasSubscriberFor(topicTomorrow)).toBe(true);
    });

    it('unsubscribes from the realtime topic on destroy', () => {
      const fixture = create();
      const topic = buildStablishmentTopic(1, today);

      expect(fakeRealtime.hasSubscriberFor(topic)).toBe(true);

      fixture.destroy();

      expect(fakeRealtime.hasSubscriberFor(topic)).toBe(false);
    });

    it('a socket that never connects leaves manual check-in fully usable', () => {
      // FakeRealtimeService never emits and no code path here depends on a
      // connected/open state — this proves the manual flow (identical to
      // the pre-existing "markTurnWaiting" test) is fully independent from
      // whether realtime ever delivers anything.
      const fixture = create();

      fixture.componentInstance.markTurnWaiting(turn(5, 'TURN_PENDING'));

      const req = httpMock.expectOne(`${TURNS_URL}/5/waiting`);
      expect(req.request.method).toBe('PUT');
      req.flush(turn(5, 'TURN_WAITNG'));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('registró su ingreso');
    });

    it('shows a manual-refresh indicator while the realtime status is closed', () => {
      const fixture = create();
      fixture.componentInstance.openTurnModal(servicio(1));
      httpMock.expectOne((req) => req.url === TURNS_URL).flush(page([]));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Actualización manual');
      expect(fixture.nativeElement.textContent).not.toContain('En vivo');
    });

    it('shows a live indicator once the realtime status turns open', () => {
      const fixture = create();
      fixture.componentInstance.openTurnModal(servicio(1));
      httpMock.expectOne((req) => req.url === TURNS_URL).flush(page([]));

      fakeRealtime.status.set('open');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('En vivo');
    });

    it('clears the pending feedback timeout on destroy without throwing', () => {
      vi.useFakeTimers();
      try {
        const fixture = create();

        fixture.componentInstance.markTurnWaiting(turn(5, 'TURN_PENDING'));
        httpMock.expectOne(`${TURNS_URL}/5/waiting`).flush(turn(5, 'TURN_WAITNG'));
        fixture.detectChanges();

        expect(() => fixture.destroy()).not.toThrow();
        expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});

describe('buildStablishmentTopic', () => {
  it('joins the stablishment id and date into the backend broadcast topic', () => {
    expect(buildStablishmentTopic(7, '2026-08-24')).toBe('/topic/stablishment/7/2026-08-24');
  });

  it('changes when either the id or the date changes', () => {
    expect(buildStablishmentTopic(1, '2026-08-24')).not.toBe(buildStablishmentTopic(2, '2026-08-24'));
    expect(buildStablishmentTopic(1, '2026-08-24')).not.toBe(buildStablishmentTopic(1, '2026-08-25'));
  });
});
