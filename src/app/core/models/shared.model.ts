/** Monetary amount shared by every priced resource in the landing contract. */
export interface Money {
  amount: number;
  currency: string;
}

/** A labelled link used across navigation, footer and CTA blocks. */
export interface NavLink {
  id: string;
  label: string;
  href: string;
}
