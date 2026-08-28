export interface WaitingRoomSite {
  /** Numeric id, needed to build the STOMP topic even when the route addressed the site by name. */
  stablishmentId: number;
  brand: string;
  location: string;
}

/**
 * One row of the column: somebody who is IN the waiting room right now.
 *
 * Two kinds of row share this shape, and `calledAt` is what tells them apart:
 *
 * - **already called** — `calledAt` set, `room` holding the consultorio they
 *   were sent to. Kept on screen after the call so the person who came back
 *   late can still read that their number came up.
 * - **still waiting** — both `null`. Checked in at reception, not called yet,
 *   so there is no call time and no door to send them to.
 *
 * A turn already attended or cancelled is NOT here at all — see
 * `SalaService.BOARD_STATUSES` on the server, which is where that rule lives.
 *
 * `room` is the SHORT code (`"03"`), the only form that fits the narrow
 * `Cons.` column. `calledAt` is never rendered as a time; it is the server's
 * ordering key for the called block, newest first.
 */
export interface WaitingRoomCall {
  ticket: string;
  room: string | null;
  calledAt: string | null;
}

/**
 * The turn being served right now.
 *
 * `room` and `roomLabel` are NOT redundant: `room` is the short code for the
 * queue's narrow column, `roomLabel` is the long form for the big panel.
 *
 * There is deliberately NO patient-name field — see the LOPDP note in
 * `jsons/sala/README.md`. Adding one means removing `specialty` in the same
 * change.
 */
export interface WaitingRoomCurrentCall {
  ticket: string;
  room: string;
  roomLabel: string;
  specialty: string;
  calledAt: string;
}

/**
 * GET /api/sala/{sedeId}/pantalla — the waiting-room display's whole state.
 *
 * `current` is NOT repeated inside `history`: history holds the OTHER rows,
 * and the screen composes `[current, ...history]` itself. That is why the
 * column's first row is always the turn in the big panel, and why it is
 * painted gold — same datum, not a coincidence.
 *
 * `history` arrives already ordered and the screen does not re-sort it: the
 * turns already called first, newest call at the top, then the ones still
 * waiting by their appointment hour. The name is now narrower than what it
 * carries — it is the column, not a history.
 *
 * Do not confuse this with `MedicalRecord.liveScreen`, which is the marketing
 * screenshot of this screen inside the landing bento: different consumer,
 * different lifecycle, and its `nextTickets` are the UPCOMING turns while
 * `history` here is everyone currently in the room.
 */
export interface WaitingRoomScreen {
  site: WaitingRoomSite;
  /**
   * NULL when nobody is being attended right now — first thing in the
   * morning, or between two patients. The mock never had this case, so the
   * screen used to read `current.ticket` unconditionally.
   */
  current: WaitingRoomCurrentCall | null;
  history: WaitingRoomCall[];
  ticker: string;
}
