import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { BookingAvailability, BookingDay, BookingDoctor, BookingSlot } from '../../../../core/models';
import { Button } from '../../atoms/button/button';
import { Chip } from '../../atoms/chip/chip';
import { Figure } from '../../atoms/figure/figure';
import { Kicker } from '../../atoms/kicker/kicker';
import { LiveDot } from '../../atoms/live-dot/live-dot';
import { Pill } from '../../atoms/pill/pill';
import { Skeleton } from '../../atoms/skeleton/skeleton';
import { PriceRow } from '../../molecules/price-row/price-row';

/**
 * One completed run through the booking demo: the doctor, day and slot the
 * visitor picked. Not a `core/models` shape — it never comes from an
 * endpoint, it's assembled locally from three separate picks the instant
 * the visitor confirms, so it belongs next to the component that builds
 * it. The landing feature decides what to actually do with it (analytics,
 * a real reservation call, nothing at all).
 */
export interface BookingSelection {
  doctor: BookingDoctor;
  day: BookingDay;
  slot: BookingSlot;
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('es-EC', { weekday: 'short' });

function formatWeekday(isoDate: string): string {
  const raw = WEEKDAY_FORMATTER.format(new Date(`${isoDate}T00:00:00`)).replace('.', '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatDayNumber(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00`).getDate();
}

/**
 * app-booking-section — "Agenda en línea" (design/Main.dc.html section 6,
 * design/Mobile.dc.html "Agenda demo"): the flagship demo of the product
 * itself — pick a doctor, a day and a time, see your plan's price, confirm.
 *
 * The whole selection (`doctorIndex`, `dayIndex`, `slotIndex`, `confirmed`)
 * is local view state; nothing here is persisted or read from a route.
 * Confirming emits `booked` with the resolved `{ doctor, day, slot }` and
 * flips the summary card into the green "Reservado" pill with the drawn
 * checkmark (`.tick` / `@keyframes tickdraw`, booking-section.css) — the
 * one animation this component owns outright, everything else composes
 * existing atoms/molecules.
 *
 * No day/service molecule exists for this shape (the design's day cell —
 * weekday label + big day figure — and the doctor/time picker chips are
 * one-off compositions of `app-figure` / `app-chip`, not a reusable
 * molecule), so the skeleton for this organism is hand-built rather than
 * delegated to a card's own `loading` branch — this is the organism the
 * brief calls out for that.
 */
@Component({
  selector: 'app-booking-section',
  imports: [Button, Chip, Figure, Kicker, LiveDot, Pill, Skeleton, PriceRow],
  templateUrl: './booking-section.html',
  styleUrl: './booking-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class BookingSection {
  readonly availability = input.required<BookingAvailability>();
  readonly loading = input(false);

  readonly booked = output<BookingSelection>();

  protected readonly doctorIndex = signal<number | null>(null);
  protected readonly dayIndex = signal<number | null>(null);
  protected readonly slotIndex = signal<number | null>(null);
  protected readonly confirmed = signal(false);

  /**
   * Fixed-count placeholders for the loading branch. `loading()` arrives
   * paired with an empty `availability()` fixture (zero doctors/days/slots),
   * so the skeleton can't iterate the real arrays — it reserves the exact
   * geometry from `jsons/landing/booking-availability.json` instead (3
   * doctors, 7 days, 12 slots) so the grid doesn't jump when data lands.
   */
  protected readonly skeletonDoctors = [0, 1, 2] as const;
  protected readonly skeletonDays = [0, 1, 2, 3, 4, 5, 6] as const;
  protected readonly skeletonSlots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

  protected readonly dayCells = computed(() =>
    this.availability().days.map((day) => ({
      day,
      weekday: formatWeekday(day.date),
      dayNumber: formatDayNumber(day.date),
    })),
  );

  private readonly selectedDoctor = computed(() => {
    const index = this.doctorIndex();
    return index === null ? undefined : this.availability().doctors[index];
  });

  private readonly selectedDay = computed(() => {
    const index = this.dayIndex();
    return index === null ? undefined : this.availability().days[index];
  });

  private readonly selectedSlot = computed(() => {
    const index = this.slotIndex();
    return index === null ? undefined : this.availability().slots[index];
  });

  protected readonly doctorLabel = computed(() => this.selectedDoctor()?.name ?? '—');
  /**
   * The range check is not redundant with the `null` check: `booking-availability`
   * is the one live resource (a rolling agenda window that the container can
   * reload), so a refreshed payload with fewer days than the held `dayIndex`
   * would leave the index pointing past the end. This computed is read
   * unconditionally by the summary card, so an unguarded dereference would throw
   * during change detection and take the whole section down — hence the same
   * defensive shape every sibling computed here already has.
   */
  protected readonly dayLabel = computed(() => {
    const index = this.dayIndex();
    if (index === null) {
      return '—';
    }
    const cell = this.dayCells()[index];
    return cell ? `${cell.weekday} ${cell.dayNumber}` : '—';
  });
  protected readonly timeLabel = computed(() => this.selectedSlot()?.time ?? '—');

  protected readonly canConfirm = computed(
    () =>
      !this.confirmed() &&
      this.selectedDoctor() !== undefined &&
      this.selectedDay() !== undefined &&
      this.selectedSlot() !== undefined,
  );

  protected pickDoctor(index: number): void {
    this.doctorIndex.set(index);
    this.confirmed.set(false);
  }

  protected pickDay(index: number): void {
    this.dayIndex.set(index);
    this.confirmed.set(false);
  }

  protected pickSlot(index: number, status: BookingSlot['status']): void {
    if (status !== 'available') {
      return;
    }
    this.slotIndex.set(index);
    this.confirmed.set(false);
  }

  protected confirm(): void {
    const doctor = this.selectedDoctor();
    const day = this.selectedDay();
    const slot = this.selectedSlot();
    if (!this.canConfirm() || !doctor || !day || !slot) {
      return;
    }
    this.confirmed.set(true);
    this.booked.emit({ doctor, day, slot });
  }
}
