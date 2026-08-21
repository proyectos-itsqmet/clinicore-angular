export interface InsurersHeader {
  kicker: string;
}

export interface InsurerItem {
  id: string;
  name: string;
}

/** GET /api/landing/insurers — static, cacheable content. */
export interface Insurers {
  header: InsurersHeader;
  items: InsurerItem[];
}
