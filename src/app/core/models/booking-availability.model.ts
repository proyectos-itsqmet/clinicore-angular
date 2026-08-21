import type { Money } from './shared.model';

export interface BookingHeader {
  kicker: string;
  title: string;
  lead: string;
}

export interface BookingDoctor {
  id: string;
  name: string;
}

/** Live data — the date grid a patient can pick a slot from. */
export interface BookingDay {
  date: string;
}

export type BookingSlotStatus = 'available' | 'booked';

/** Live data — occupied/free slots change in real time. */
export interface BookingSlot {
  time: string;
  status: BookingSlotStatus;
}

export interface BookingService {
  name: string;
  listPrice: Money;
  insurancePrice: Money;
  insurerLabel: string;
}

/**
 * GET /api/landing/booking-availability — live data: days, slots and prices
 * change on every load (see jsons/landing/README.md).
 */
export interface BookingAvailability {
  header: BookingHeader;
  badge: string;
  doctors: BookingDoctor[];
  days: BookingDay[];
  slots: BookingSlot[];
  service: BookingService;
  slotsLegend: string;
  priceDisclaimer: string;
  confirmationNote: string;
}
