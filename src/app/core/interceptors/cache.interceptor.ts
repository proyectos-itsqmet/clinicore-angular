import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HttpCacheService } from '../cache/http-cache.service';
import { CACHE_ENABLED, CACHE_TAGS, CACHE_TTL, INVALIDATE_TAGS } from '../cache/cache.tokens';

/**
 * Endpoints that must never be cached under any circumstance.
 */
const EXCLUDED_URL_PATTERNS = [
  '/auth/',
  '/turn-board-websocket',
  '/api/auth',
  '/health'
];

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  const cacheService = inject(HttpCacheService);

  // Check if URL should be completely excluded from caching logic
  const isExcluded = EXCLUDED_URL_PATTERNS.some(pattern => req.url.includes(pattern));
  if (isExcluded) {
    return next(req);
  }

  // Handle Mutations: POST, PUT, PATCH, DELETE
  if (req.method !== 'GET') {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const customInvalidateTags = req.context.get(INVALIDATE_TAGS);
      return next(req).pipe(
        tap({
          next: event => {
            if (event instanceof HttpResponse && event.status >= 200 && event.status < 300) {
              cacheService.invalidateForRequest(req, customInvalidateTags);
            }
          }
        })
      );
    }
    return next(req);
  }

  // Handle GET requests
  const isCacheEnabled = req.context.get(CACHE_ENABLED);
  const hasNoCacheHeader =
    req.headers.get('Cache-Control') === 'no-cache' ||
    req.headers.get('Pragma') === 'no-cache';

  if (!isCacheEnabled || hasNoCacheHeader) {
    return next(req);
  }

  const cacheKey = cacheService.generateKey(req);
  const cachedResponse = cacheService.get(cacheKey);

  if (cachedResponse) {
    return of(cachedResponse);
  }

  const ttl = req.context.get(CACHE_TTL);
  const customTags = req.context.get(CACHE_TAGS);

  return next(req).pipe(
    tap({
      next: event => {
        if (event instanceof HttpResponse && event.status === 200) {
          cacheService.set(cacheKey, event, customTags, ttl);
        }
      }
    })
  );
};
