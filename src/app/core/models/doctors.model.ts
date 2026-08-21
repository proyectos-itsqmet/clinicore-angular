export interface DoctorsHeader {
  kicker: string;
  title: string;
  viewAllHref: string;
  totalCount: number;
}

/** Live sub-resource — reflects the doctor's real upcoming agenda. */
export interface DoctorUpcomingSlot {
  date: string;
  time: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  registrationNumber: string;
  image: string;
  upcomingSlots: DoctorUpcomingSlot[];
}

/**
 * GET /api/landing/doctors — the profile (photo, specialty, registration) is
 * static; `upcomingSlots` is live agenda data (see jsons/landing/README.md).
 */
export interface Doctors {
  header: DoctorsHeader;
  items: Doctor[];
}
