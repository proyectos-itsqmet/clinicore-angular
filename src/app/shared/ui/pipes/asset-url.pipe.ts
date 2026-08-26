import { Pipe, PipeTransform } from '@angular/core';

/**
 * The only place in the codebase that decides where deployed photos live.
 *
 * The contract ships BARE FILENAMES — `"hero.jpg"`, never `"/img/hero.jpg"` —
 * and both producers of it agree: the backend's
 * `src/main/resources/landing/*.json` and the bundled fallback copy in
 * `public/mock/landing`. That is on purpose: an API contract must not carry a
 * deployment path, because the same JSON is served to a client that may mount
 * its images anywhere. This constant is where that decision is made, once.
 *
 * The photos themselves live in `public/img`, committed to this repository and
 * copied verbatim into the build by the `public` asset glob in `angular.json`.
 * They are NOT synced in from anywhere at build time: what you clone is what
 * deploys, and `/img/hero.jpg` is same-origin with the app that asks for it.
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
