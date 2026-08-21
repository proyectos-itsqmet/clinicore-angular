import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AdminNav, type AdminNavEntry } from './admin-nav';

const NAV: readonly AdminNavEntry[] = [
  {
    id: 'g1',
    label: 'Grupo uno',
    icon: 'grid',
    path: 'g1',
    children: [
      { path: 'a', label: 'Hoja A' },
      { path: 'b', label: 'Hoja B' },
    ],
  },
  {
    id: 'g2',
    label: 'Grupo dos',
    icon: 'chart',
    path: 'g2',
    children: [{ path: 'c', label: 'Hoja C' }],
  },
  { id: 'l1', label: 'Link suelto', icon: 'box', path: 'l1', children: [] },
];

@Component({ template: '' })
class Blank {}

@Component({
  imports: [AdminNav],
  template: `<app-admin-nav [entries]="entries" basePath="/admin" />`,
})
class Host {
  readonly entries = NAV;
}

type Fixture = ReturnType<typeof TestBed.createComponent<Host>>;

describe('AdminNav', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'admin/g1/a', component: Blank },
          { path: 'admin/g1/b', component: Blank },
          { path: 'admin/g2/c', component: Blank },
          { path: 'admin/l1', component: Blank },
        ]),
      ],
    });
  });

  /**
   * The component is created AFTER navigating, which is exactly the deep-link
   * shape: the first `NavigationEnd` has already fired, so the accordion can
   * only get this right from `router.url`'s initial value.
   */
  async function renderAt(url: string): Promise<Fixture> {
    await TestBed.inject(Router).navigateByUrl(url);
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  }

  function groupButtons(fixture: Fixture): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button.nav-row'));
  }

  function openIds(fixture: Fixture): string[] {
    return groupButtons(fixture)
      .filter((button) => button.getAttribute('aria-expanded') === 'true')
      .map((button) => button.getAttribute('aria-controls') ?? '');
  }

  function leafLabels(fixture: Fixture): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.nav-leaf-label')).map(
      (node) => (node as HTMLElement).textContent?.trim() ?? '',
    );
  }

  it('renders groups as buttons and childless entries as links', async () => {
    const fixture = await renderAt('/admin/l1');

    expect(groupButtons(fixture).length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('a.nav-row').length).toBe(1);
  });

  /**
   * THE invariant. Keep the open group in a plain `signal()` instead of the
   * `linkedSignal` and this is the test that fails: the nav renders closed over
   * the very page it is showing.
   */
  it('opens the group holding the active route on a deep link', async () => {
    const fixture = await renderAt('/admin/g2/c');

    expect(openIds(fixture)).toEqual(['admin-nav-panel-g2']);
    expect(leafLabels(fixture)).toEqual(['Hoja C']);
  });

  it('opens no group when a direct link is the active route', async () => {
    const fixture = await renderAt('/admin/l1');

    expect(openIds(fixture)).toEqual([]);
  });

  it('opens one group at a time — opening a second closes the first', async () => {
    const fixture = await renderAt('/admin/g1/a');
    expect(openIds(fixture)).toEqual(['admin-nav-panel-g1']);

    groupButtons(fixture)[1].click();
    fixture.detectChanges();

    expect(openIds(fixture)).toEqual(['admin-nav-panel-g2']);
  });

  it('closes a group when its own row is clicked again', async () => {
    const fixture = await renderAt('/admin/g1/a');

    groupButtons(fixture)[0].click();
    fixture.detectChanges();

    expect(openIds(fixture)).toEqual([]);
  });

  /**
   * The other half of the `linkedSignal`: the user's manual toggle is honoured
   * until the route moves to a different group, and then the accordion snaps
   * back to where the user actually is.
   */
  it('snaps back to the route group after navigating, discarding a manual toggle', async () => {
    const fixture = await renderAt('/admin/g1/a');

    // Manually collapse everything.
    groupButtons(fixture)[0].click();
    fixture.detectChanges();
    expect(openIds(fixture)).toEqual([]);

    await TestBed.inject(Router).navigateByUrl('/admin/g2/c');
    fixture.detectChanges();

    expect(openIds(fixture)).toEqual(['admin-nav-panel-g2']);
  });

  /**
   * Half an ARIA pattern is worse than none — `app-segmented` in this same
   * project shipped `role="tab"` with no `aria-controls` and its own doc says
   * so. This asserts the disclosure is wired WHOLE: the id `aria-controls`
   * names has to exist in the DOM.
   */
  it('points `aria-controls` at a panel that actually exists', async () => {
    const fixture = await renderAt('/admin/g1/a');
    const expanded = groupButtons(fixture).find((button) => button.getAttribute('aria-expanded') === 'true');
    const panelId = expanded?.getAttribute('aria-controls');

    expect(panelId).toBe('admin-nav-panel-g1');
    expect(fixture.nativeElement.querySelector(`#${panelId}`)).toBeTruthy();
  });

  it('marks the active destination with `aria-current="page"`', async () => {
    const fixture = await renderAt('/admin/g1/b');
    const current = Array.from(fixture.nativeElement.querySelectorAll('a[aria-current="page"]')) as HTMLElement[];

    expect(current.length).toBe(1);
    expect(current[0].textContent?.trim()).toBe('Hoja B');
  });
});
