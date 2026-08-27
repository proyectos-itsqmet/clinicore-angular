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

  /**
   * The secondary CTA. Named for what it DOES, not for a channel: it used to
   * be `whatsapp` and to carry a WhatsApp deep link, and it now opens the
   * in-page assistant instead. Leaving the old key would have left the
   * contract asserting a channel the button does not open.
   *
   * `href` is kept in the shape so the CTA can go back to being a link
   * without a model change, but the hero ignores it — see `hero-section.html`.
   */
  contact: HeroCta;
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
