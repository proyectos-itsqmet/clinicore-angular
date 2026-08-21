export interface HowItWorksHeader {
  kicker: string;
  title: string;
}

export interface HowItWorksStep {
  id: string;
  number: number;
  image: string;
  title: string;
  description: string;
}

/** GET /api/landing/how-it-works — static, cacheable content. */
export interface HowItWorks {
  header: HowItWorksHeader;
  steps: HowItWorksStep[];
}
