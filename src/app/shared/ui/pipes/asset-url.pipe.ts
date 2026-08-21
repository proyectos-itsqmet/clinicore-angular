import { Pipe, PipeTransform } from '@angular/core';

/**
 * The only place in the codebase that decides where deployed photos
 * live. Contract JSON files (jsons/landing/*.json) intentionally ship
 * bare filenames (e.g. "hero.jpg") — an API contract must not carry a
 * deployment path. `scripts/sync-assets.mjs` is what actually copies
 * design/photos/*.jpg into Frontend/public/img/ at build/serve time;
 * this constant is the single spot that has to agree with it.
 */
export const ASSET_BASE_PATH = '/img';

/**
 * app-assetUrl — turns a bare contract filename into the served image
 * path: `"hero.jpg" | assetUrl` -> `"/img/hero.jpg"`.
 *
 * Pure and injection-free on purpose: a pipe living in `shared/ui`
 * must not reach for anything beyond its input, so the base path is a
 * plain constant rather than an `InjectionToken`.
 *
 * Idempotent — a value that already looks like a path or URL
 * (`/...`, `http://...`, `https://...`) is returned untouched, so
 * applying the pipe twice by mistake is harmless.
 */
@Pipe({
  name: 'assetUrl',
  standalone: true,
  pure: true,
})
export class AssetUrlPipe implements PipeTransform {
  transform(file: string | null | undefined): string {
    if (!file) {
      return '';
    }

    if (file.startsWith('/') || file.startsWith('http')) {
      return file;
    }

    return `${ASSET_BASE_PATH}/${file}`;
  }
}
