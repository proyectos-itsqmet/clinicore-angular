import { DOCUMENT, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { SalaApi } from '../../core/api';
import { RealtimeService } from '../../core/realtime/realtime.service';
import type { WaitingRoomScreen } from '../../core/models';
import { Figure } from '../../shared/ui/atoms/figure/figure';
import { Kicker } from '../../shared/ui/atoms/kicker/kicker';
import { LiveDot } from '../../shared/ui/atoms/live-dot/live-dot';
import { VerticalMarquee } from '../../shared/ui/molecules/vertical-marquee/vertical-marquee';

/** One row of the called-turns column. */
interface QueueRow {
  ticket: string;
  room: string;
  /** The turn in the big panel. Painted gold — same datum, not a coincidence. */
  current: boolean;
}

/**
 * app-waiting-room-display — the clinic's waiting-room screen
 * (`design/pantalla-turnos/`, tema invertido: cromo oscuro, contenido claro).
 *
 * NOT a page, and the name says so on purpose. It is a TV: fixed aspect ratio,
 * no scroll, no header, no footer, nobody touching it. That shapes every
 * decision below.
 *
 * SCALE. The whole screen is drawn in `rem` at 120rem x 67.5rem (1920/16 and
 * 1080/16); `html.signage` in `shared/tokens/base.css` decides what a `rem` is
 * worth via `min()` of both viewport axes. Read that block before changing a
 * single length here — including why the rule cannot live in a component
 * stylesheet and why the class is toggled from this component's lifecycle.
 *
 * That is also why the radii are `rounded-[1.5rem]` / `rounded-br-[0.5rem]`
 * rather than the `rounded-card` / `rounded-br-card-nub` utilities every other
 * card in the system uses: the tokens behind those are fixed px, so the
 * signature corner would stop scaling with the screen. Same shape, same
 * numbers at base size, expressed in the unit this surface needs.
 *
 * NEVER GO BLANK. A clinic's TV showing nothing is worse than a TV showing
 * slightly old numbers, so the last good payload is latched in `lastGood` and
 * keeps painting through a failed poll, with the header's live dot dropping its
 * pulse and the label switching to "Sin conexión". `httpResource` clears
 * `value()` on error; without the latch, one network blip would blank the
 * screen for five seconds.
 *
 * NO SKELETON, deliberately, against the project's usual law. The first paint
 * is one request against one small document, and a shimmering ghost of a 240px
 * turn number on a waiting-room TV reads as a broken screen, not as loading.
 * A single honest "Conectando…" is the better answer here.
 *
 * POLLING LIVES HERE, not in `SalaApi`: the service is `providedIn: 'root'`, so
 * an interval started there would outlive the route forever. `afterNextRender`
 * keeps both intervals browser-only and `DestroyRef` tears them down, so the
 * polling lifetime is exactly this component's lifetime.
 */
@Component({
  selector: 'app-waiting-room-display',
  imports: [DatePipe, Figure, Kicker, LiveDot, VerticalMarquee],
  templateUrl: './waiting-room-display.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class WaitingRoomDisplay {
  /**
   * Safety net, NOT the live channel any more. The socket drives refreshes;
   * this only covers the window where the socket dropped and has not
   * reconnected, so a TV can be at most this stale rather than frozen.
   *
   * It was 5s when polling WAS the mechanism. The README did the arithmetic:
   * 12 requests a minute per screen, 48 for a clinic with four rooms, all
   * day, to notice a change that the backend already knows about the
   * instant it happens.
   */
  private static readonly POLL_MS = 60_000;

  /**
   * The clock only renders `HH:mm`, and `minuteTick` stores the epoch
   * truncated to the minute — so 5 out of 6 of these ticks write the value
   * that is already there, the signal's `===` check drops them, and nothing
   * re-renders. A 10s interval that costs one render per minute.
   */
  private static readonly CLOCK_MS = 10_000;

  /**
   * Rows the queue window shows whole: 41.125rem of window over a 6.75rem
   * pitch (6rem row + 0.75rem gap) fits 6.
   *
   * Above this the list overflows and has to loop; at or below it, it does
   * NOT — and that is the same threshold `app-vertical-marquee`'s two-copy
   * technique needs, because the failing condition (strip shorter than the
   * window) and "there is nothing to scroll" are the same condition. So
   * `animate` is simply "does it overflow", and a short list rendering static
   * is correct behaviour rather than a fallback. Change a row height or the
   * screen's vertical rhythm and this number moves with it.
   */
  private static readonly ROWS_THAT_FIT = 6;

  /** Bound from the `:sedeId` route param via `withComponentInputBinding()`. */
  readonly sedeId = input.required<string>();

  private readonly api = inject(SalaApi);
  private readonly realtime = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly lastGood = signal<WaitingRoomScreen | undefined>(undefined);
  private readonly minuteTick = signal(WaitingRoomDisplay.startOfMinute(Date.now()));

  /**
   * The payload being painted: the fresh one, or the last one that arrived.
   *
   * `hasValue()` is NOT decoration around a `?? fallback`. `value()` on a
   * resource in the error state RETHROWS — it does not return `undefined` — so
   * `value() ?? lastGood()` throws out of this computed the moment a poll
   * fails, taking the whole screen down instead of falling back to the last
   * good payload. Which is precisely the blank TV this latch exists to prevent.
   * `hasValue()` is the guard that answers without throwing.
   */
  protected readonly data = computed(() =>
    this.api.screen.hasValue() ? this.api.screen.value() : this.lastGood(),
  );

  /** Showing real data, but the newest poll failed. */
  protected readonly stale = computed(() => !!this.api.screen.error() && !!this.data());

  /** Failed before ever getting a payload — nothing to show at all. */
  protected readonly failedCold = computed(() => !!this.api.screen.error() && !this.data());

  protected readonly now = computed(() => new Date(this.minuteTick()));

  /**
   * `[current, ...history]`, which is why the queue's first row is always the
   * turn in the big panel.
   *
   * The dedupe is defensive, and worth its three lines: the contract says
   * `history` excludes `current` (`jsons/sala/README.md`), but if a backend
   * ever ships it in both, `@for`'s `track row.ticket` sees a duplicate key
   * and Angular throws — which on this surface means a BLANK TV in a waiting
   * room. Keeping the first occurrence keeps `current` and renders correctly.
   */
  protected readonly rows = computed<QueueRow[]>(() => {
    const data = this.data();
    if (!data) {
      return [];
    }

    // `current` is null when nobody is being attended: the queue is then just
    // the history, with no golden row. Spreading a null here is what would
    // throw out of this computed and blank the TV.
    const composed: QueueRow[] = [
      ...(data.current
        ? [{ ticket: data.current.ticket, room: data.current.room, current: true }]
        : []),
      ...(data.history ?? []).map((call) => ({ ticket: call.ticket, room: call.room, current: false })),
    ];

    const seen = new Set<string>();
    return composed.filter((row) => {
      if (seen.has(row.ticket)) {
        return false;
      }
      seen.add(row.ticket);
      return true;
    });
  });

  protected readonly animateQueue = computed(() => this.rows().length > WaitingRoomDisplay.ROWS_THAT_FIT);

  constructor() {
    // `html.signage` is what makes 1rem a fraction of the viewport. It has to
    // come off on the way out, or every other route inherits a root font-size
    // tied to the window and the landing's whole type scale breaks.
    const root = inject(DOCUMENT).documentElement;
    root.classList.add('signage');
    this.destroyRef.onDestroy(() => root.classList.remove('signage'));

    // The route param can't reach `SalaApi` through DI, and `httpResource` has
    // to be created in an injection context, so the service exposes a writable
    // signal and this is the one place that writes it.
    effect(() => this.api.sedeId.set(this.sedeId()));

    // The latch behind `data()`. Only ever moves forward, never back to
    // `undefined`, which is the whole point. `hasValue()` for the same reason
    // as in `data()`: reading `value()` in the error state throws.
    effect(() => {
      if (this.api.screen.hasValue()) {
        this.lastGood.set(this.api.screen.value());
      }
    });

    // The live channel. A message on this topic means "something changed on
    // this board"; the screen then re-fetches the authoritative state over
    // REST rather than trusting the payload — the rule RealtimeService
    // documents, and the reason the anonymous topic can stay anonymous.
    //
    // The socket alone cannot paint this screen: it emits ONE turn per event,
    // so a TV switched on at 3pm would have no morning history. The REST call
    // is the cold start; the socket only says "ask again".
    effect((onCleanup) => {
      const topic = this.boardTopic();
      if (!topic) {
        return;
      }
      const sub = this.realtime.subscribeTopic(topic).subscribe(() => this.api.screen.reload());
      onCleanup(() => sub.unsubscribe());
    });

    afterNextRender(() => {
      const poll = setInterval(() => this.api.screen.reload(), WaitingRoomDisplay.POLL_MS);
      const clock = setInterval(
        () => this.minuteTick.set(WaitingRoomDisplay.startOfMinute(Date.now())),
        WaitingRoomDisplay.CLOCK_MS,
      );

      this.destroyRef.onDestroy(() => {
        clearInterval(poll);
        clearInterval(clock);
      });
    });
  }

  /**
   * `/topic/stablishment/{id}/{yyyy-MM-dd}` — exactly what
   * `TurnService#broadcastTurnUpdate` publishes to.
   *
   * Depends on `minuteTick`, so it recomputes as the clock advances and the
   * subscription follows the board across midnight. A TV runs for months; it
   * cannot hold yesterday’s topic.
   */
  protected readonly boardTopic = computed(() => {
    const id = this.data()?.site?.stablishmentId;
    if (id == null) {
      return null;
    }
    return `/topic/stablishment/${id}/${WaitingRoomDisplay.localIsoDate(new Date(this.minuteTick()))}`;
  });

  /**
   * LOCAL yyyy-MM-dd, never `toISOString().slice(0, 10)`.
   *
   * The backend builds this segment from a `LocalDate`, which is the clinic’s
   * calendar day. `toISOString` is UTC: from 19:00 in UTC-5 it already reports
   * TOMORROW, so the screen would subscribe to an empty topic every evening
   * and silently stop updating for the busiest hours of the day.
   */
  private static localIsoDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private static startOfMinute(epochMs: number): number {
    return Math.floor(epochMs / 60_000) * 60_000;
  }
}
