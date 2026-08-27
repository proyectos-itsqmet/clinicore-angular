import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Token to enable or disable caching for a specific request.
 * Default is true for GET requests on API endpoints.
 */
export const CACHE_ENABLED = new HttpContextToken<boolean>(() => true);

/**
 * Time-to-live in milliseconds for cached responses.
 * Default: 5 minutes (300,000 ms).
 */
export const CACHE_TTL = new HttpContextToken<number>(() => 5 * 60 * 1000);

/**
 * Custom cache tags associated with the request (e.g. ['doctors', 'catalog']).
 */
export const CACHE_TAGS = new HttpContextToken<string[]>(() => []);

/**
 * Specific cache tags to invalidate when a mutation succeeds.
 */
export const INVALIDATE_TAGS = new HttpContextToken<string[]>(() => []);

/**
 * Helper to build an HttpContext with caching options for GET requests.
 */
export function withCache(options?: {
  enabled?: boolean;
  ttl?: number;
  tags?: string[];
}): HttpContext {
  const context = new HttpContext();
  if (options?.enabled !== undefined) {
    context.set(CACHE_ENABLED, options.enabled);
  }
  if (options?.ttl !== undefined) {
    context.set(CACHE_TTL, options.ttl);
  }
  if (options?.tags && options.tags.length > 0) {
    context.set(CACHE_TAGS, options.tags);
  }
  return context;
}

/**
 * Helper to build an HttpContext with mutation invalidation tags.
 */
export function withInvalidation(tags: string[]): HttpContext {
  const context = new HttpContext();
  if (tags && tags.length > 0) {
    context.set(INVALIDATE_TAGS, tags);
  }
  return context;
}
