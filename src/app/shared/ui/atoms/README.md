# Atoms

The smallest pieces of the design system with meaning of their own. None of
them know a clinic, an appointment, or the landing page exist — every atom
receives its appearance and its content through `input()` / projected
content. This is the layer the mobile app and the admin panel import as-is.

Geometry, colors and motion come from `shared/tokens/theme.css` and
`shared/tokens/base.css`, extracted from `design/Main.dc.html`,
`design/Mobile.dc.html` and `design/Palette.dc.html`.

| Atom | Inputs | Variants / tones | Used for |
| --- | --- | --- | --- |
| `app-button` | `variant`, `size`, `href?`, `disabled`, `fullWidth`, `type`, `form?` | variant: `primary` (spinning beam) · `whatsapp` · `glass` · `ghost` · `emergency` · `quiet` · `danger` — size: `sm` (44px) · `md` (52px) · `lg` (58px) | Every CTA: "Agenda tu cita", WhatsApp contact, nav "Llamar", "Emergencia 24/7" — plus every table-row action and dialog button in the admin panel |
| `app-pill` | `tone`, `size` | tone: `tint` (default) · `glass` · `ok` · `gold` · `plain` — size: `md` (44px) · `sm` (32px, in-table badge) | Specialty counts, prices, dates, review quotes, nav status pills. Project `<app-icon>` before the text for an icon prefix |
| `app-chip` | `selected`, `disabled` | — (radius morphs 16px ↔ pill on `selected`) | Doctor / day / time-slot pickers in the booking widget |
| `app-icon` | `name` (required), `size` (20), `strokeWidth` (2), `label?` | `calendar` · `document` · `capsule` · `phone` · `check` · `arrow` · `whatsapp` · `shield` · `star` · `plus` · `menu` · `clock` · `location` · `user` · `grid` · `chart` · `box` · `droplet` · `tag` · `ban` · `banknote` · `chevron` · `pencil` · `trash` · `warning` | Every inline glyph in the system. Decorative (`aria-hidden`) unless `label` is set |
| `app-skeleton` | `variant`, `width`, `height?`, `lines`, `radius?` | `text` · `block` · `circle` · `pill` | Loading placeholder for any endpoint-fed organism. Always `aria-hidden`; **the loading container must set `aria-busy="true"`** |
| `app-progress-ring` | `percent`, `size` (124), `color`, `delayMs` | color: `blue` · `ok` | The stats-row counters ("médicos disponibles", "% satisfacción", ...). Project an `<app-figure>` for the centered number |
| `app-star-rating` | `value` (required), `max` (5), `size` (20) | — | Review scores. `role="img"` + spoken `aria-label`, fills fractional stars via gradient |
| `app-live-dot` | `size` ('9px'), `tone` | tone: `live` (default, pulsing) · `stale` (gold-deep, **no pulse**) | The pulsing "en vivo" indicator, always paired with a text label that carries the meaning |
| `app-figure` | `size` ('40px'), `tone` | `ink` (default) · `ink-3` · `gold` · `gold-ink` · `blue` · `ok` · `surface` | Any display number: cupos, turno counters, ring centers, prices, and every figure on the waiting-room display. Project a suffix element with `appFigureSuffix` for a smaller trailing unit |
| `app-kicker` | `tone`, `size?` | `muted` (default) · `gold` · `accent` · `soft` · `warn` | The uppercase eyebrow label above section headings. `size` overrides only the font size — the `.14em` tracking, the 700 weight and the uppercase always come from `text-kicker` |
| `app-section-heading` | `kicker?`, `kickerTone`, `heading` (required), `note?` | — | The kicker + h2 + optional right-aligned note pattern repeated at the top of nearly every section |

## Decisions not in the spec

- **`app-button` variants `ghost` and `glass`**: the boards don't show a
  literal button in either style. `glass` reuses the design's own `.glass`
  recipe (translucent `surface` fill + blur, for dark/photo backgrounds).
  `ghost` is a transparent, blue-bordered secondary button for light
  backgrounds. Both are reasonable extrapolations from the palette, not
  copies of an exact instance.
- **`app-button` `type` input**: not requested, added so the atom is usable
  inside real forms without the caller fighting the default `submit`
  behavior of a bare `<button>`.
- **`app-chip` disabled color**: the "unavailable" struck-through chip in
  the board uses `#F3F0EC`, a color that is not one of the approved tokens.
  Substituted `field` (`#FAF7F3`) instead of inventing a new hex.
- **`app-icon` — `clock`, `location`, `user`**: not drawn anywhere in
  `Main.dc.html` / `Mobile.dc.html`, only listed in the brief. Drawn to match
  the same visual language as the rest (24x24, 2px stroke, round caps).
- **`app-icon` `shield`**: the only shield in the boards has a checkmark
  baked into the same instance (a "verified" composition). Extracted as a
  plain shield outline so it composes with the separate `check` icon
  instead of being a fixed compound icon.
- **Color reuse instead of raw white**: "white text on a filled button" is
  expressed as `text-surface` (surface = `#FFFFFF`) rather than reaching for
  Tailwind's built-in `white`, so every literal color in the system still
  resolves through a named project token.
- **`app-chip` transition**: the board times `background-color`, `color`,
  `border-color` and `border-radius` independently (180ms / 180ms / 180ms /
  300ms). Simplified to one `transition-all duration-300`, since Tailwind
  utility classes can't express four independent durations without arbitrary
  soup, and the radius morph is the transition that matters visually.

## Extended for the waiting-room display

`/sala/:sedeId` is signage: watched from four metres away, drawn in `rem` so it
scales to any 16:9 panel, and dark-field. Three atoms grew for it, all additively
— every default is exactly what it was, so no landing consumer changed:

- **`app-live-dot` `size`** — the design's 9px dot is simply not visible on a TV,
  and it has to scale with the screen, so that consumer passes a `rem` length.
- **`app-live-dot` `tone: 'stale'`** — the dot has to be able to say the opposite
  of "live". Stopping the pulse is the load-bearing half; a dot that keeps
  breathing while nothing arrives is a lie.
- **`app-kicker` `size`** — the display has its own type scale by definition. A
  13px label is unreadable across a room.
- **`app-kicker` `tone: 'warn'`** and **`app-live-dot`'s stale color** are
  `--color-gold-deep`, not `--color-emergency`. Measured, not preferred: the
  emergency red is 2.19:1 on the screen's navy-deep field and fails even the
  large-text bar, while gold-deep — the system's own "gold on dark backgrounds"
  token — is 6.54:1.
- **`app-icon`, eight new glyphs** — `grid`, `chart`, `box`, `droplet`, `tag`,
  `ban`, `banknote` exist because the admin panel's nav has twelve first-level
  groups and only five of the original set could serve one (`shield`, `clock`,
  `calendar`, `user`, `document`). They are not in any board; `design/panel-admin/`
  is where they were drawn, in the same 24x24 / 2px-stroke / round-cap language.
  `chevron` is the eighth and its absence was a real hole: it is the disclosure
  glyph every expandable row needs, and `arrow` is not a substitute — it carries
  a shaft and reads as "go", not as "open".

  Worth flagging while it is fresh: `icon.html` now repeats the same nine
  attribute bindings twenty-two times. It is the established shape of the file
  and was followed rather than refactored mid-feature, but it is a real
  candidate for one shared `<svg>` wrapper with a `@switch` over just the paths.

- **`app-figure` `blue` / `ink-3` / `gold-ink`** — the turn number sits on a
  white panel where `--color-gold` measures 1.6:1 and is unusable, the queue's
  consultorio column is secondary next to its ticket, and the current row is a
  solid gold tile whose only legible ink is `--gold-ink` (the pair theme.css
  declares as "ink on top of gold").

## Extended for the admin panel's CRUD sections

Four sections of `/admin` stopped being placeholders (sedes, operadores,
doctores, servicios), and three atoms grew for them. All three are additive —
every existing default is byte-for-byte what it was, so no landing consumer
changed.

- **`app-button` `size: 'sm'`** — 44px, the project LEY's tap floor and not one
  pixel under. It exists as a NAMED size precisely so a caller cannot reach the
  same visual result by shrinking the atom with utilities and land at 38px: a
  table row with three actions has no room for a 52px control, and that pressure
  is exactly how tap targets get quietly broken.
- **`app-button` `quiet` / `danger`** — a row with three actions cannot carry
  three bordered buttons. `quiet` is the neutral one (transparent, `ink-2`,
  `field` on hover), `danger` its destructive twin (transparent, `emergency`).
  `danger` is NOT a duplicate of `emergency`: that variant is the solid red 24/7
  CTA on the landing, and a solid red fill repeated three times down a table
  reads as an error state, not as a delete button.
- **`app-button` `form`** — the native `form` attribute. `app-modal` projects the
  form into its scrolling body and the actions into its fixed footer, so the
  submit button is not a descendant of the form it submits. The alternatives were
  a click handler (which kills submit-on-Enter, since a form with no submit
  button inside it has no implicit submission) or putting the actions back inside
  the scrolling region, where "Guardar" sits below the fold on a phone.
- **`app-pill` `size: 'sm'`** — 32px / 13px. This closes a gap the previous
  version of `../molecules/README.md` flagged and declined to fix: "the board's
  in-card badges are smaller than the standard pill (32–34px tall, 13px type) —
  `app-pill` has no `size` variant to match". It does now, and the reason it is
  allowed to go under the 44px floor is that a pill is a `<span>`, never a
  target; everything clickable is an `app-button` or an `app-chip`, and both keep
  the floor.
- **`app-icon` — `pencil`, `trash`, `warning`** — a row that can be edited and
  deleted needs both verbs legible at a glance in a dense table, and a
  destructive confirmation needs a glyph that says stop before the copy does.
  Not in any board; drawn in the same 24x24 / 2px-stroke / round-cap language as
  the rest, like the eight the panel's nav already needed.

## Not requested, not built

Nothing in the brief was skipped. If a future atom needs a color or radius
that isn't already a token in `shared/tokens/theme.css`, that's a gap to
flag, not a value to invent inline.

One gap is open and named rather than papered over: **`app-button` has no
router-aware link mode.** Given `href` it renders an `<a href>`, which inside an
authenticated SPA is a full document load. `features/admin/doctors` therefore
hand-writes its "Ver detalles" `<a [routerLink]>` with this atom's own
`quiet`/`sm` recipe, hoisted into one constant. `app-card` has the same hole.
The fix is a `routerLink` branch in both — note that `button.html` and `card.html`
each carry a doc comment about keeping exactly ONE textual `ng-content`
occurrence, so a third branch has to reuse the existing `ng-template`, not
duplicate the slot.
