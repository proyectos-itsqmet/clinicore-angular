export interface HeroTrustPill {
  id: string;
  text: string;
}

export interface HeroCta {
  label: string;
  href: string;
}

export interface HeroCtas {
  primary: HeroCta;
  whatsapp: HeroCta;
}

export interface HeroImages {
  background: string;
  inset: string;
}

/** Live sub-resource — today's open slot count changes with every booking. */
export interface HeroAvailability {
  label: string;
  count: number;
  unit: string;
  specialty: string;
  location: string;
}

/**
 * GET /api/landing/hero — kicker, title and pills are static; `availability`
 * is live data (see jsons/landing/README.md).
 */
export interface Hero {
  kicker: string;
  title: string;
  lead: string;
  trustPills: HeroTrustPill[];
  ctas: HeroCtas;
  images: HeroImages;
  availability: HeroAvailability;
}
