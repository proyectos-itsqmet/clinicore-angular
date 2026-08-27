import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpRequest, HttpResponse } from '@angular/common/http';

export interface CacheEntry {
  response: HttpResponse<unknown>;
  expiresAt: number;
  tags: Set<string>;
  key: string;
}

/**
 * Cross-resource invalidation map: when resource A is mutated,
 * all associated resources listed in relatedTags will also be invalidated.
 */
const RELATED_TAGS_MAP: Record<string, string[]> = {
  turns: ['turns', 'turnos', 'metrics'],
  turnos: ['turns', 'turnos', 'metrics'],
  metrics: ['metrics', 'turns', 'turnos'],
  doctors: ['doctors', 'schedules', 'schedule-templates', 'consultorios', 'time-offs'],
  schedules: ['schedules', 'schedule-templates', 'turns', 'turnos'],
  'schedule-templates': ['schedule-templates', 'schedules'],
  'time-offs': ['time-offs', 'schedules'],
  holidays: ['holidays', 'schedules'],
  patients: ['patients', 'patient-coverages', 'encounters'],
  'patient-coverages': ['patient-coverages', 'patients', 'coverage-plans'],
  'coverage-plans': ['coverage-plans', 'insurers', 'patient-coverages'],
  insurers: ['insurers', 'coverage-plans'],
  encounters: ['encounters', 'prescriptions', 'clinical-access-log', 'patients'],
  prescriptions: ['prescriptions', 'encounters'],
  'clinical-access-log': ['clinical-access-log', 'encounters'],
  invoices: ['invoices', 'accounting', 'payments', 'claims'],
  payments: ['payments', 'invoices', 'accounting'],
  claims: ['claims', 'invoices', 'accounting'],
  accounting: ['accounting', 'invoices', 'payments'],
  establishments: ['establishments', 'consultorios', 'doctors', 'operators'],
  consultorios: ['consultorios', 'establishments'],
  operators: ['operators', 'establishments'],
  servicios: ['servicios', 'service-packages', 'doctors', 'consultorios'],
  'service-packages': ['service-packages', 'promotions', 'servicios'],
  promotions: ['promotions', 'service-packages'],
  'block-reasons': ['block-reasons', 'turns', 'turnos'],
  branding: ['branding'],
  'admin-module': ['admin-module']
};

@Injectable({ providedIn: 'root' })
export class HttpCacheService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly cache = new Map<string, CacheEntry>();

  /**
   * Generates a unique cache key from an HttpRequest or URL string.
   */
  generateKey(reqOrUrl: HttpRequest<unknown> | string): string {
    if (typeof reqOrUrl === 'string') {
      return reqOrUrl;
    }
    return reqOrUrl.urlWithParams;
  }

  /**
   * Retrieves a cached HttpResponse if present and not expired.
   */
  get(key: string): HttpResponse<unknown> | null {
    if (!this.isBrowser) {
      return null;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.response.clone();
  }

  /**
   * Stores an HttpResponse into the cache with tags and expiration.
   */
  set(
    key: string,
    response: HttpResponse<unknown>,
    tags: string[] = [],
    ttlMs: number = 5 * 60 * 1000
  ): void {
    if (!this.isBrowser) {
      return;
    }

    const derivedTags = this.extractTagsFromKey(key);
    const combinedTags = new Set<string>([...derivedTags, ...tags]);

    this.cache.set(key, {
      response: response.clone(),
      expiresAt: Date.now() + ttlMs,
      tags: combinedTags,
      key
    });
  }

  /**
   * Invalidates all cache entries with a matching tag.
   */
  invalidateTag(tag: string): void {
    if (!this.isBrowser || this.cache.size === 0) {
      return;
    }

    const normalizedTag = tag.toLowerCase().trim();
    const relatedTags = new Set<string>([
      normalizedTag,
      ...(RELATED_TAGS_MAP[normalizedTag] ?? [])
    ]);

    for (const [key, entry] of this.cache.entries()) {
      const matches = Array.from(entry.tags).some(t => relatedTags.has(t.toLowerCase()));
      if (matches) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidates all cache entries matching any of the provided tags.
   */
  invalidateTags(tags: string[]): void {
    for (const tag of tags) {
      this.invalidateTag(tag);
    }
  }

  /**
   * Invalidates cache specifically affected by a mutating HttpRequest.
   */
  invalidateForRequest(req: HttpRequest<unknown>, customTags: string[] = []): void {
    const tagsFromReq = this.extractTagsFromKey(req.urlWithParams);
    const allTagsToInvalidate = new Set<string>([...tagsFromReq, ...customTags]);

    for (const tag of allTagsToInvalidate) {
      this.invalidateTag(tag);
    }

    // Also remove the exact URL if it happened to be cached
    const exactKey = this.generateKey(req);
    this.cache.delete(exactKey);
  }

  /**
   * Clears the entire cache.
   */
  invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * Returns current cache statistics.
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Extracts resource segment tags from a URL.
   * e.g., "http://localhost:8080/api/doctors/123/services" -> ["doctors", "services"]
   */
  extractTagsFromKey(key: string): string[] {
    try {
      // Remove query string and protocol/domain
      const cleanPath = key.split('?')[0].replace(/^https?:\/\/[^/]+/i, '');
      const segments = cleanPath
        .split('/')
        .map(s => s.trim())
        .filter(s => s.length > 0 && s !== 'api' && s !== 'auth');

      // Filter out pure IDs (UUIDs or numeric IDs)
      const isId = (segment: string) => /^\d+$/.test(segment) || /^[0-9a-fA-F-]{10,}$/.test(segment) || segment === 'me';
      
      const tags = segments.filter(seg => !isId(seg));
      return Array.from(new Set(tags));
    } catch {
      return [];
    }
  }
}
