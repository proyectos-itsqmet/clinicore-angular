export interface MedicalRecordHeader {
  kicker: string;
  title: string;
}

export interface MedicalRecordNextTicket {
  ticket: string;
  time: string;
}

/** Live data — the waiting-room screen's current ticket and queue. */
export interface MedicalRecordLiveScreen {
  status: string;
  location: string;
  /** Bare contract filename (e.g. "waiting.jpg") — resolve with `AssetUrlPipe`. */
  image: string;
  currentTicket: string;
  office: string;
  nextTickets: MedicalRecordNextTicket[];
}

export interface MedicalRecordBenefit {
  id: string;
  title: string;
  description: string;
  image: string | null;
}

/**
 * GET /api/landing/medical-record — `liveScreen` is live data; `benefits` is
 * static content (see jsons/landing/README.md).
 */
export interface MedicalRecord {
  header: MedicalRecordHeader;
  liveScreen: MedicalRecordLiveScreen;
  benefits: MedicalRecordBenefit[];
}
