export interface StatItem {
  id: string;
  value: number;
  label: string;
  sublabel: string;
  /**
   * Fill of the ring `app-progress-ring` draws, with `value` printed inside it.
   * On the item that carries `suffix: '%'` the two are the same quantity in the
   * same unit and MUST be equal — otherwise the arc stops short of the number it
   * encircles and the reader sees the contradiction directly. On the unsuffixed
   * items the ring is unlabelled decoration and `percent` is free.
   */
  percent: number;
  /** Only present on the percentage-shaped stat (e.g. "96%"). */
  suffix?: string;
}

/** GET /api/landing/stats — sample figures, static and cacheable. */
export interface Stats {
  items: StatItem[];
}
