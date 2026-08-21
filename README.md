# Frontend

Angular 22 standalone app for the clinic landing (Sistema Inteligente de Gestión de
Turnos, Atención y Experiencia del Cliente).

## Run

```bash
npm start
```

Serves at `http://localhost:4200/`. Runs `sync:assets` first (see below), so photos and
JSON contract fixtures are in place before Angular boots.

## Build

```bash
npm run build
```

Also runs `sync:assets` first. Output goes to `dist/`.

## Test

```bash
npm run test
```

This is `ng test`, the **only** supported way to run this project's tests — it goes
through `@angular/build:unit-test`, the builder that wires up the Angular/Vitest
environment (TestBed, zoneless change detection, component compilation). Running
`npx vitest run` directly skips that builder entirely: Vitest boots with no test
environment configured, so even `describe`/`it` are undefined and every spec fails
before anything project-specific runs. If you see `ReferenceError: describe is not
defined`, that's the tell — you bypassed the builder. Use `npm run test`.

`--watch` defaults to `true` in a TTY and `false` otherwise, so `npm run test` runs once
and exits in CI or an agent shell but parks in watch mode in your own terminal. When you
need a single run no matter where you are:

```bash
npm run test:ci
```

Same builder, `--watch=false` pinned, so the warning above still holds.

## Sync assets

```bash
npm run sync:assets
```

Copies the three single-source-of-truth folders that live outside `Frontend/` into
the places Angular serves from:

- `design/photos/*.jpg` → `Frontend/public/img/`
- `jsons/landing/*.json` → `Frontend/public/mock/landing/`
- `jsons/sala/*.json` → `Frontend/public/mock/sala/`

Both `public/img/` and `public/mock/` are generated (gitignored) — never edit the
copies, only their sources.

### Always go through npm, never through `ng` directly

The sync is wired as npm pre-hooks (`prestart`, `prebuild`, `prewatch`, `pretest`,
`pretest:ci`), so `npm start`, `npm run build`, `npm run watch` and `npm run test`
refresh the copies for you. Invoking the CLI directly — `ng serve`, `ng build`,
`ng test` — skips the hooks entirely and serves whatever stale copy is already on disk.

That failure mode is **silent**, which is what makes it worth a warning: `httpResource`
casts the parsed body to its model without validating it, so a served JSON that has
drifted from `jsons/landing/` behind a required model property produces `undefined` at
runtime with no compile error and no console message — a photo that quietly stops
rendering, or a figure that contradicts the ring drawn around it. It has already
happened once (`coverage.backgroundImage`, `medicalRecord.liveScreen.image` and
`stats.satisfaccion.percent` all went missing or stale in the served copies).

This cannot be fixed by pointing `angular.json`'s `assets` at `../jsons/landing`
instead — verified: `@angular/build:application` rejects it with *"The ../jsons/landing
asset path must be within the workspace root."* The copy step is mandatory, so the
discipline is: **run npm scripts, not `ng`.** If you must use `ng` directly, run
`npm run sync:assets` first, and to prove the copies match their sources:

```bash
for f in ../jsons/landing/*.json; do diff -q "$f" "public/mock/landing/$(basename "$f")"; done
```

Silence means all fifteen are byte-identical.

## Design system

- Visual spec: `design/Main.dc.html` (1440px desktop) and `design/Mobile.dc.html`
  (390px mobile), one section per numbered comment. Read-only reference — never edited.
- Design tokens: `src/app/shared/tokens/theme.css` — every color used in the app is a
  token from this file; no hex literals elsewhere.
- Component library: `src/app/shared/ui/` (`atoms/`, `molecules/`, `organisms/`), each
  tier with its own `README.md` documenting what exists and how to compose it.
- Data contract: `jsons/landing/*.json` (one file per landing section) is the API
  contract — `src/app/core/models/` mirrors its shape, `src/app/core/api/landing-api.ts`
  fetches it, `src/app/features/landing/` composes the organisms around it.

## Routes

| Route | Component | Render mode | Data |
| --- | --- | --- | --- |
| `/` | `app-landing-page` | Prerendered | `LandingApi`, one `httpResource` per section of `jsons/landing` |
| `/sala/:sedeId` | `app-waiting-room-display` | **Client** | `SalaApi`, polling `jsons/sala/pantalla.json` every 5s |
| `/admin/**` | `app-admin-layout` + 31 child routes | **Client** | none yet — every section is a marked placeholder |

### `/sala/:sedeId` — the waiting-room display

Open it on the clinic's TV in kiosk mode; locally, `http://localhost:4200/sala/matriz`
(the sede id is plumbed through for real but the mock ignores it — see
`core/api/sala-screen-url.ts`).

Three things about it are unlike anything else in this app, and all three are
deliberate:

- **It is not a page.** Fixed 16:9, no scroll, no header, no footer. The design is
  120rem x 67.5rem and `html.signage` in `shared/tokens/base.css` decides what a
  `rem` is worth from `min()` of both viewport axes, so it scales to any 16:9 panel
  and letterboxes on anything else. That class is added and removed by the
  component's own lifecycle — leave it behind and the landing's entire type scale
  retunes itself to the window size.
- **Client-rendered, not prerendered.** `sala/:sedeId` is listed explicitly in
  `app.routes.server.ts` BEFORE the `**`. Not a preference: a dynamic param under
  `RenderMode.Prerender` needs a `getPrerenderParams`, and without one the BUILD
  fails. And prerendering a kiosk buys nothing — the HTML would be stale in five
  seconds.
- **It never goes blank.** A failed poll keeps painting the last good payload and
  the header switches from "En vivo" to "Sin conexión". Note for anyone touching
  that code: `httpResource.value()` RETHROWS in the error state rather than
  returning `undefined`, so the fallback has to be guarded with `hasValue()`.

### `/admin` — the admin panel

`http://localhost:4200/admin` (redirects to `/admin/dashboard/resumen`).

**One array drives everything.** `features/admin/admin-nav.data.ts` holds the whole
tree — 8 groups + 4 direct links, 31 destinations — and `admin.routes.ts` GENERATES
the route table from it, breadcrumbs and page titles included. Add an entry and both
its menu row and its route exist. Declaring 31 destinations twice, once as menu
markup and once as routes, is a guarantee they will drift, and the failure is silent:
a menu item that 404s, or a page nothing links to.

**It is a layout route.** `/admin` is a component with a `<router-outlet>`; the
sections are its children. Flatten it into siblings and the accordion, the scroll
position and the drawer state all reset on every click.

**The accordion derives from the URL** through a `linkedSignal`, which is writable
but resets when its source changes. Use a plain signal and a deep link or a reload
renders the nav closed over the page it is showing. See
`shared/ui/molecules/admin-nav/`.

**Responsive at one breakpoint.** `lg:` (1024px) and nothing else: fixed 280px
sidebar above, drawer over a scrim below. There is no small version of a 12-group
nav — at 390px a 280px column eats 72% of the width — so it stops sharing space and
covers instead. The drawer is 300 of 390 on purpose: the visible strip of scrim is
what you tap to close.

Two things to know before touching it: the sidebar's brand bar and the top bar are
both 64px at `lg:` and their hairlines have to read as ONE line across the screen, so
change one and change the other. And the layout closes the drawer itself when the
window crosses `lg:` — without that, opening the drawer at phone width and widening
the window leaves the shell `inert` with nothing on screen able to clear it.

Every section is a marked placeholder today: one component, `admin-placeholder-page`,
reading its own title from the generated route data. No fake tables, no decorative
charts. Replacing one is a one-line change to that route's `loadComponent`.
