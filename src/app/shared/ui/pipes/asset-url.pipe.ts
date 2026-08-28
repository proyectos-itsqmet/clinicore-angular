import { Pipe, PipeTransform } from '@angular/core';

export const ASSET_BASE_PATH = '/img';

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
