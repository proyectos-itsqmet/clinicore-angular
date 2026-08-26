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

## Assets live in this repository

Everything the deployed app serves is committed here, under `public/`:

- `public/img/*.jpg` — the photographs the landing renders
- `public/mock/landing/*.json` — the landing contract, served as a fallback when
  the API is unreachable (`LANDING_FALLBACK_BASE_URL`)
- `public/mock/sala/*.json` — the waiting-room screen's own contract
- `public/favicon.ico`

`angular.json` copies the whole folder into the build through its `public` asset
glob, so a clone is a complete, deployable app: no sync step, no npm pre-hooks, no
path reaching outside the workspace.

### Why there is no longer a sync step

`public/img` and `public/mock` used to be gitignored COPIES, regenerated from
`../design/photos` and `../jsons/landing` by `scripts/sync-assets.mjs` wired as
npm pre-hooks. Two things made that a bad trade:

1. **The deployable app depended on folders outside the repository.** Deploying
   from GitHub — a clone, a CI runner, a `git archive` — produced a build with an
   empty `public/img` and a landing full of broken image icons. Nothing failed
   loudly; Angular happily copies an empty folder.
2. **The refresh was silent when it did not happen.** Invoking `ng serve` instead
   of `npm start` skipped the hooks and served a stale copy, and `httpResource`
   casts a parsed body to its model without validating it — so a property that
   had drifted arrived as `undefined` with no compile error and no console
   message. It happened: `coverage.backgroundImage`,
   `medicalRecord.liveScreen.image` and `stats.satisfaccion.percent` all went
   missing or stale in the served copies.

Both are gone. `public/` is the source now — edit the files in place, and use
`ng` or `npm` as you like.

`../design/photos` and `../jsons/landing` still exist as the design and contract
archives for the workspace as a whole. They are NOT read by this build. If a
photograph changes there, copy it into `public/img` deliberately and commit it.

### Keeping the fallback honest

`public/mock/landing/*.json` and `Backend_QMS/src/main/resources/landing/*.json`
are the same contract served from two places — the API, and the bundled copy the
landing falls back to when the API is down. Nothing enforces that they agree, so
check when you change either:

```bash
for f in public/mock/landing/*.json; do
  diff -q "$f" "../Backend_QMS/src/main/resources/landing/$(basename "$f")"
done
```

Two files are expected to be missing on the backend side —
`booking-availability.json` and `medical-record.json` have no endpoint yet.

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
