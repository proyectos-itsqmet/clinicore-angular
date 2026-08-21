export interface FaqHeader {
  kicker: string;
  title: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

/** GET /api/landing/faq — static, cacheable content. */
export interface Faq {
  header: FaqHeader;
  items: FaqItem[];
}
