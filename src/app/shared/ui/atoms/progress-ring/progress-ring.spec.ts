import { TestBed } from '@angular/core/testing';
import { ProgressRing } from './progress-ring';

describe('ProgressRing', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressRing],
    }).compileComponents();
  });

  /** Renders the ring at a given percent and reads the `--off` custom
   * property Angular writes onto `circle.p` — the exact value the
   * `.counter-ring circle.p` CSS rule feeds into `stroke-dashoffset`. */
  function offsetFor(percent: number): string {
    const fixture = TestBed.createComponent(ProgressRing);
    fixture.componentRef.setInput('percent', percent);
    fixture.detectChanges();
    const circle = fixture.nativeElement.querySelector('circle.p') as SVGCircleElement;
    return circle.style.getPropertyValue('--off').trim();
  }

  it('offsets 0% to the full circumference (653)', () => {
    expect(offsetFor(0)).toBe('653');
  });

  it('offsets 50% to half the circumference (326.5)', () => {
    expect(offsetFor(50)).toBe('326.5');
  });

  it('offsets 100% to zero', () => {
    expect(offsetFor(100)).toBe('0');
  });

  it('clamps values above 100 to zero offset', () => {
    expect(offsetFor(140)).toBe('0');
  });

  it('clamps negative values to the full circumference', () => {
    expect(offsetFor(-20)).toBe('653');
  });

  /**
   * Regression: the wrapper used to carry the design board's own class name,
   * `ring`, which is ALSO a Tailwind utility — in v4 a bare `ring` compiles to
   * `box-shadow: 0 0 0 calc(1px + var(--tw-ring-offset-width))
   * var(--tw-ring-color, currentcolor)`, and the wrapper has no border-radius,
   * so every counter got a hard-cornered `currentcolor` square drawn around it.
   * The class is `counter-ring` now (and `.counter-ring circle.p` in both
   * progress-ring.css and shared/tokens/base.css depends on that exact name).
   *
   * This asserts the class list itself rather than the computed box-shadow:
   * the utility lives in the global Tailwind stylesheet, which TestBed does not
   * load, so a re-introduced `ring` would compute to no shadow here and the
   * test would pass while the app was broken again.
   */
  it('does not put the Tailwind `ring` utility class on the wrapper', () => {
    const fixture = TestBed.createComponent(ProgressRing);
    fixture.detectChanges();
    const wrapper = fixture.nativeElement.querySelector('span.counter-ring') as HTMLElement;

    expect(wrapper).toBeTruthy();
    expect(wrapper.classList.contains('ring')).toBe(false);
  });
});
