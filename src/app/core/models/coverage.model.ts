import type { Money } from './shared.model';

export interface CoverageHeader {
  kicker: string;
  title: string;
  lead: string;
}

export interface CoverageCta {
  label: string;
  href: string;
}

export interface CoverageCtas {
  primary: CoverageCta;
  phone: CoverageCta;
}

export interface CoverageRow {
  id: string;
  label: string;
  price: Money;
}

export interface CoverageNoPlanRow {
  label: string;
  price: Money;
}

/**
 * GET /api/landing/coverage — sample prices for the closing CTA, static and
 * cacheable (see jsons/landing/README.md).
 */
export interface Coverage {
  header: CoverageHeader;
  /** Bare contract filename (e.g. "pediatric.jpg") — resolve with `AssetUrlPipe`. */
  backgroundImage: string;
  ctas: CoverageCtas;
  panelTitle: string;
  rows: CoverageRow[];
  noPlanRow: CoverageNoPlanRow;
  note: string;
}
