import localeEsEc from '@angular/common/locales/es-EC';
import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { SALA_SCREEN_URL, SalaApi } from '../../core/api';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { CACHE_ENABLED } from '../../core/cache/cache.tokens';
import type { WaitingRoomCall, WaitingRoomScreen } from '../../core/models';
import { WaitingRoomDisplay } from './waiting-room-display';

const URL = '/test/pantalla.json';

function call(n: number, room = '01'): WaitingRoomCall {
  return { ticket: `B-${String(n).padStart(3, '0')}`, room, calledAt: '2026-08-21T21:00:00-05:00' };
}

/**
 * Somebody who checked in and is still sitting there.
 *
 * `calledAt: null` IS the contract for it — see `SalaService.BOARD_STATUSES`.
 * There is no separate flag on the wire because there is nothing to invent: a
 * turn nobody called has no call time, and no consultorio to walk to either.
 */
function waiting(n: number): WaitingRoomCall {
  return { ticket: `B-${String(n).padStart(3, '0')}`, room: null, calledAt: null };
}

function payload(history: WaitingRoomCall[]): WaitingRoomScreen {
  return {
    site: { stablishmentId: 1, brand: 'CliniCore', location: 'Sede [NOMBRE] · [CIUDAD]' },
    current: {
      ticket: 'B-042',
      room: '03',
      roomLabel: 'Consultorio 3',
      specialty: '[ESPECIALIDAD]',
      calledAt: '2026-08-21T21:35:12-05:00',
    },
    history,
    ticker: 'mensaje',
  };
}

/** `history` descending from B-041, so it never collides with `current`. */
function history(count: number): WaitingRoomCall[] {
  return Array.from({ length: count }, (_, i) => call(41 - i));
}

type Fixture = ReturnType<typeof TestBed.createComponent<WaitingRoomDisplay>>;

/**
 * Drains microtasks AND the macrotask queue.
 *
 * Used everywhere instead of `fixture.whenStable()` on purpose. `whenStable()`
 * waits for the in-flight HTTP task to settle, and before a flush that task is
 * waiting for the flush — so awaiting it first deadlocks until the test times
 * out, which is exactly how the first version of this spec failed. And after a
 * flush it is still not enough on its own: `httpResource` publishes the parsed
 * body in a microtask, so a synchronous `detectChanges()` right after `flush()`
 * still sees `undefined` and the component paints "Conectando…" — the second way
 * this spec failed.
 */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('WaitingRoomDisplay', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    // The template formats the clock through `DatePipe` at `es-EC`, exactly as
    // app.config.ts does — without this the pipe throws NG0701.
    registerLocaleData(localeEsEc);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'es-EC' },
        // The whole URL shape lives behind the token, so a test never has to
        // know or stub a base path — see sala-screen-url.ts.
        { provide: SALA_SCREEN_URL, useValue: () => URL },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  /** Mounted and with its first request in flight, NOT yet answered. */
  async function create(): Promise<Fixture> {
    const fixture = TestBed.createComponent(WaitingRoomDisplay);
    fixture.componentRef.setInput('sedeId', 'sede-1');
    fixture.detectChanges();
    await tick();
    fixture.detectChanges();
    return fixture;
  }

  /** Mounted, answered, and rendered. */
  async function render(screen: WaitingRoomScreen): Promise<Fixture> {
    const fixture = await create();
    httpMock.expectOne(URL).flush(screen);
    await tick();
    fixture.detectChanges();
    return fixture;
  }

  function rowTickets(fixture: Fixture): string[] {
    // The FIRST strip only: the second is the `aria-hidden` duplicate that makes
    // the loop seamless, and counting it would double every row.
    //
    // Reads each row's FIRST `<app-figure>` — the ticket, with the consultorio
    // as the second. Neither a `<span>` query nor a regex over the tile's
    // `textContent` works: `app-figure` nests its spans, so the first returns
    // every value twice, and the second sees "B-04203" because the two figures
    // sit adjacent with no whitespace between them.
    const strip = fixture.nativeElement.querySelector('.vq-strip') as HTMLElement;
    return Array.from(strip.children).map(
      (tile) => tile.querySelector('app-figure')?.textContent?.trim() ?? '',
    );
  }

  /** Same strip, same order, but the SECOND `<app-figure>`: the consultorio. */
  function rowRooms(fixture: Fixture): string[] {
    const strip = fixture.nativeElement.querySelector('.vq-strip') as HTMLElement;
    return Array.from(strip.children).map(
      (tile) => tile.querySelectorAll('app-figure')[1]?.textContent?.trim() ?? '',
    );
  }

  function tiles(fixture: Fixture): HTMLElement[] {
    const strip = fixture.nativeElement.querySelector('.vq-strip') as HTMLElement;
    return Array.from(strip.children) as HTMLElement[];
  }

  function queue(fixture: Fixture): HTMLElement {
    return fixture.nativeElement.querySelector('.vq') as HTMLElement;
  }

  it('composes the queue as [current, ...history]', async () => {
    const fixture = await render(payload(history(3)));

    expect(rowTickets(fixture)).toEqual(['B-042', 'B-041', 'B-040', 'B-039']);
  });

  /**
   * The first row IS the turn in the big panel, so it carries the gold tile —
   * the same datum in two places, which is exactly what the color is saying.
   */
  it('paints only the current turn gold', async () => {
    const fixture = await render(payload(history(3)));
    const tiles = Array.from(
      (fixture.nativeElement.querySelector('.vq-strip') as HTMLElement).children,
    ) as HTMLElement[];

    expect(tiles[0].classList.contains('bg-gold')).toBe(true);
    expect(tiles.slice(1).every((tile) => tile.classList.contains('bg-tint'))).toBe(true);
  });

  /**
   * The column now holds two different things, and the tile has to say which
   * is which from five metres away: a turn ALREADY CALLED (cool `bg-tint`,
   * with a consultorio to walk to) versus one STILL WAITING (`bg-field`, the
   * quiet neutral, with nothing in the room column yet).
   *
   * Not cosmetic. It is the whole reason the waiting ones were let in: the
   * person in the chair has to find their own number and count how many are
   * above it, and a queue that looks identical to a call list cannot be read
   * that way.
   */
  it('tells a turn already called apart from one still waiting', async () => {
    const fixture = await render(payload([call(41), waiting(50)]));

    // [0] is `current`, painted gold — asserted by its own test above.
    expect(tiles(fixture)[1].classList.contains('bg-tint')).toBe(true);
    expect(tiles(fixture)[2].classList.contains('bg-field')).toBe(true);
  });

  /**
   * Nobody called them, so there is no consultorio — and an empty column is
   * the honest render. Printing a placeholder there would send a patient
   * looking for a door that was never assigned.
   */
  it('leaves the consultorio column empty for a turn nobody called yet', async () => {
    const fixture = await render(payload([call(41, '02'), waiting(50)]));

    expect(rowRooms(fixture)).toEqual(['03', '02', '']);
  });

  /**
   * `jsons/sala/README.md` says `history` must exclude `current`. If a backend
   * ever ships it in both, `@for`'s `track row.ticket` sees a duplicate key and
   * Angular throws — which on this surface means a BLANK TV in a waiting room.
   * The dedupe keeps the first occurrence, so `current` survives and the screen
   * still renders.
   */
  it('survives a backend that repeats the current turn inside history', async () => {
    const fixture = await render(payload([call(42, '03'), ...history(2)]));

    expect(rowTickets(fixture)).toEqual(['B-042', 'B-041', 'B-040']);
  });

  /**
   * Invariant 2 of the two-copy loop: 6 rows fit the window whole, so there is
   * nothing to scroll AND the strip would be shorter than the window — the same
   * condition. Static is correct, not a fallback.
   */
  it('does not animate when the queue fits the window (6 rows)', async () => {
    const fixture = await render(payload(history(5)));

    expect(rowTickets(fixture).length).toBe(6);
    expect(fixture.nativeElement.querySelectorAll('.vq-strip').length).toBe(1);
    expect(queue(fixture).classList.contains('vq-static')).toBe(true);
  });

  it('animates as soon as the queue overflows the window (7 rows)', async () => {
    const fixture = await render(payload(history(6)));

    expect(rowTickets(fixture).length).toBe(7);
    expect(fixture.nativeElement.querySelectorAll('.vq-strip').length).toBe(2);
    expect(queue(fixture).classList.contains('vq-static')).toBe(false);
  });

  /**
   * A clinic's TV showing nothing is worse than one showing slightly old
   * numbers. `httpResource` clears `value()` on error, so without the
   * `lastGood` latch a single failed poll would blank the screen.
   */
  it('keeps painting the last good payload when a poll fails, and says so', async () => {
    const fixture = await render(payload(history(6)));

    TestBed.inject(SalaApi).screen.reload();
    await tick();
    fixture.detectChanges();
    httpMock.expectOne(URL).error(new ProgressEvent('network error'));
    await tick();
    fixture.detectChanges();

    // Still showing the turns...
    expect(rowTickets(fixture).length).toBe(7);
    // ...but no longer claiming to be live.
    expect(fixture.nativeElement.textContent).toContain('Sin conexión');
    expect(fixture.nativeElement.textContent).not.toContain('En vivo');
  });

  it('opts OUT of the HTTP cache, or the board freezes for five minutes', async () => {
    // LA falla que costó la tarde entera.
    //
    // `CACHE_ENABLED` viene en `true` por defecto y `CACHE_TTL` en 5 minutos,
    // así que este GET se cacheaba como cualquier otro. Cada `reload()` — el
    // del socket y el del sondeo — recibía `of(cachedResponse)` sin salir a la
    // red, y la pantalla mostraba lo mismo durante cinco minutos con el socket
    // conectado, el topic correcto y los mensajes llegando.
    //
    // El panel de admin no lo sufre porque sus PUT invalidan el caché. Esta
    // pantalla SOLO LEE: nada invalida su entrada nunca. Un tablero cuyo único
    // trabajo es estar al día no puede pasar por un caché.
    const fixture = await create();

    const req = httpMock.expectOne(URL);
    expect(req.request.context.get(CACHE_ENABLED)).toBe(false);

    req.flush(payload(history(3)));
    await tick();
    fixture.detectChanges();
  });

  it('does not warn about the connection when the socket is down but the poll works', async () => {
    // Polling is the mechanism again (POLL_MS = 5s), so a dead socket does NOT
    // make this screen stale — it keeps refreshing every five seconds. The dot
    // has to track what actually keeps the numbers current, or it alarms a
    // waiting room over an infrastructure detail that changes nothing for a
    // patient. The inverse case — poll failing — is the test right below.
    const realtime = TestBed.inject(RealtimeService);
    const fixture = await render(payload(history(3)));

    realtime.status.set('connecting');
    fixture.detectChanges();

    // La etiqueta "En vivo" se quitó: decía la verdad sobre el fetch y nada
    // sobre el socket, y el fetch venía del caché. Lo que queda es la ADVERTENCIA,
    // que sólo debe aparecer cuando el feed realmente falló — no por un socket
    // caído mientras el sondeo mantiene la pantalla al día.
    expect(rowTickets(fixture).length).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).not.toContain('Sin conexión');
  });

  it('says it cannot show the turns when it never got a payload at all', async () => {
    const fixture = await create();

    httpMock.expectOne(URL).error(new ProgressEvent('network error'));
    await tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No podemos mostrar los turnos');
  });

  /**
   * The root font-size that makes every `rem` on this screen a fraction of the
   * viewport is global CSS keyed on `html.signage`. Leaving it behind would
   * retune the landing's entire type scale to the window size.
   */
  it('adds `signage` to the document element and removes it on destroy', async () => {
    const fixture = await render(payload(history(6)));
    const root = fixture.nativeElement.ownerDocument.documentElement as HTMLElement;

    expect(root.classList.contains('signage')).toBe(true);

    fixture.destroy();

    expect(root.classList.contains('signage')).toBe(false);
  });
});
