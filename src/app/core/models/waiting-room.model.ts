export interface WaitingRoomSite {
  brand: string;
  location: string;
}

/**
 * One row of the called-turns list.
 *
 * `room` is the SHORT code (`"03"`) — the only form that fits the narrow
 * `Cons.` column. `calledAt` is never rendered: it is the server-defined
 * ordering key, newest first, and the only thing that makes "el más reciente
 * arriba" a contract instead of a hope.
 */
export interface WaitingRoomCall {
  ticket: string;
  room: string;
  calledAt: string;
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
 * `current` is NOT repeated inside `history`: history holds the calls BEFORE
 * the current one, newest first, and the screen composes `[current,
 * ...history]` itself. That is why the queue's first row is always the turn in
 * the big panel, and why it is painted gold — same datum, not a coincidence.
 *
 * Do not confuse this with `MedicalRecord.liveScreen`, which is the marketing
 * screenshot of this screen inside the landing bento: different consumer,
 * different lifecycle, and its `nextTickets` are the UPCOMING turns while
 * `history` here is the ones already called.
 */
export interface WaitingRoomScreen {
  site: WaitingRoomSite;
  current: WaitingRoomCurrentCall;
  history: WaitingRoomCall[];
  ticker: string;
}
