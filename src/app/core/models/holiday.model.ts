import type { BlockReason } from './block-reason.model';
import type { Establishment } from './establishment.model';

/**
 * A date on which a clinic (or one specific establishment) does not operate.
 * Mirrors `HolidayDTO` (Backend_QMS).
 *
 * `stablishment` is ABSENT/`null` for a chain-wide holiday and present for a
 * site-specific one — see `Holiday` entity's own comment in Backend_QMS.
 * `HolidayService#mapToDTO` only ever populates `id`/`name`/`address` on the
 * nested establishment (never its `doctors`/`services`/`operators` lists).
 */
export interface Holiday {
  id: number;
  date: string;
  description: string;
  stablishment?: Establishment | null;
  reason: BlockReason;
  createdAt: string;
  /**
   * Ids of `Schedule` slots that already had a booked turn on this date and
   * were therefore left untouched instead of being auto-blocked to
   * `STATUS_UNAVAILABLE`. Populated ONLY by `create()`/`update()` responses
   * (`HolidayService#create/update` in Backend_QMS) — always absent on
   * `getAll()`/`getById()` reads, so this can never be recovered later from
   * a plain list refresh. See `HolidayListComponent` for how this is
   * surfaced the moment it arrives.
   */
  conflictingScheduleIds?: number[];
}

export interface HolidayCreate {
  date: string;
  description: string;
  /** Omit or send `null` for "todas las sedes" (global holiday). */
  stablishment?: { id: number } | null;
  reason: { id: number };
}
