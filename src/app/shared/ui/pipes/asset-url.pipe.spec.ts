import { AssetUrlPipe } from './asset-url.pipe';

describe('AssetUrlPipe', () => {
  const pipe = new AssetUrlPipe();

  it('prefixes a bare contract filename with the served base path', () => {
    expect(pipe.transform('hero.jpg')).toBe('/img/hero.jpg');
  });

  it('leaves an already-rooted path untouched (idempotent)', () => {
    expect(pipe.transform('/img/hero.jpg')).toBe('/img/hero.jpg');
  });

  it('leaves an absolute URL untouched', () => {
    expect(pipe.transform('https://example.com/hero.jpg')).toBe('https://example.com/hero.jpg');
  });

  it('returns an empty string for null/undefined/empty input', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });
});
