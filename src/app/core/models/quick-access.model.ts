export type QuickAccessTone = 'default' | 'emergency';

export interface QuickAccessItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  tone: QuickAccessTone;
}

/** GET /api/landing/quick-access — static, cacheable content. */
export interface QuickAccess {
  items: QuickAccessItem[];
}
