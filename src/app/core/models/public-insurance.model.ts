export interface PublicInsuranceHeader {
  kicker: string;
  title: string;
}

export interface PublicInsuranceItem {
  id: string;
  name: string;
  requirements: string;
}

/** GET /api/landing/public-insurance — static, cacheable content. */
export interface PublicInsurance {
  header: PublicInsuranceHeader;
  items: PublicInsuranceItem[];
}
