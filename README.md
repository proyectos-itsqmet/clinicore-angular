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

Copies the two single-source-of-truth folders that live outside `Frontend/` into the
places Angular serves from:

- `design/photos/*.jpg` → `Frontend/public/img/`
- `jsons/landing/*.json` → `Frontend/public/mock/landing/`

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
