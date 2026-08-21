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
   * `.ring circle.p` CSS rule feeds into `stroke-dashoffset`. */
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
});
