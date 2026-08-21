import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { VerticalMarquee } from './vertical-marquee';

/**
 * The host's state is signals, not plain fields, on purpose: this app runs
 * zoneless, so mutating a plain property and calling `detectChanges()` does not
 * reliably push the new value into an OnPush child's input — the first version
 * of this spec did exactly that and its "animate again" case failed while every
 * initial-binding case passed. Signals propagate unconditionally.
 */
@Component({
  imports: [VerticalMarquee],
  template: `
    <app-vertical-marquee [animate]="animate()" [gap]="gap()" [durationSeconds]="durationSeconds()">
      <ng-template>
        <div class="row">fila</div>
      </ng-template>
    </app-vertical-marquee>
  `,
})
class Host {
  readonly animate = signal(true);
  readonly gap = signal('0.75rem');
  readonly durationSeconds = signal(34);
}

type Fixture = ReturnType<typeof TestBed.createComponent<Host>>;

describe('VerticalMarquee', () => {
  function render(): Fixture {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  }

  function strips(fixture: Fixture): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.vq-strip'));
  }

  function container(fixture: Fixture): HTMLElement {
    return fixture.nativeElement.querySelector('.vq') as HTMLElement;
  }

  /**
   * Invariant 1 — the gaps must match. The container gap, the strip gap and the
   * `vq-roll` keyframe's offset all read `--vq-gap`, so asserting the property
   * lands on the element is what proves the three cannot drift apart. This is
   * the improvement over `app-marquee`, whose `32px` is baked into the global
   * `sc-l` / `sc-r` keyframes and therefore cannot be an input at all.
   */
  it('writes the gap as `--vq-gap`, the single value all three gaps read', () => {
    const fixture = render();
    fixture.componentInstance.gap.set('1.25rem');
    fixture.detectChanges();

    expect(container(fixture).style.getPropertyValue('--vq-gap').trim()).toBe('1.25rem');
  });

  it('writes the duration as `--vq-duration` in seconds', () => {
    const fixture = render();
    fixture.componentInstance.durationSeconds.set(61);
    fixture.detectChanges();

    expect(container(fixture).style.getPropertyValue('--vq-duration').trim()).toBe('61s');
  });

  /**
   * The projected row is authored ONCE as an `<ng-template>` and rendered twice
   * internally, because Angular cannot clone projected content. The duplicate
   * is what makes the loop seamless, and it must be `aria-hidden` so assistive
   * tech doesn't read the queue twice.
   */
  it('renders the row twice while animating, with the copy hidden from a11y', () => {
    const fixture = render();
    const rendered = strips(fixture);

    expect(rendered.length).toBe(2);
    expect(rendered[0].getAttribute('aria-hidden')).toBeNull();
    expect(rendered[1].getAttribute('aria-hidden')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('.row').length).toBe(2);
  });

  /**
   * Invariant 2 — the strip must be at least as tall as the window, or a gap
   * opens that neither copy covers. `animate: false` is the caller saying the
   * list already fits, and the correct response is ONE copy: duplicating a
   * fully visible list would show every row twice.
   */
  it('renders the row once when not animating, and marks itself static', () => {
    const fixture = render();
    fixture.componentInstance.animate.set(false);
    fixture.detectChanges();

    expect(strips(fixture).length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.row').length).toBe(1);
    expect(container(fixture).classList.contains('vq-static')).toBe(true);
  });

  it('drops the static marker as soon as it animates again', () => {
    const fixture = render();
    fixture.componentInstance.animate.set(false);
    fixture.detectChanges();
    fixture.componentInstance.animate.set(true);
    fixture.detectChanges();

    expect(container(fixture).classList.contains('vq-static')).toBe(false);
    expect(strips(fixture).length).toBe(2);
  });
});
