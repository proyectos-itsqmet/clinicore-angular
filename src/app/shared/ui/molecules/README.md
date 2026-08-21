# Molecules

Molecules compose atoms into a reusable unit. None of them know a clinic,
an appointment, or the landing page exist — every molecule receives its
content through `input()`, and may type an input with a `core/models`
shape only when that shape is genuinely domain (a review, a doctor, a
booking service). None imports anything from `features/`.

Geometry, colors and motion come from `shared/tokens/theme.css` and
`shared/tokens/base.css`, extracted from `design/Main.dc.html` and
`design/Mobile.dc.html`.

| Molecule | Inputs | Variants / tones | Used for |
| --- | --- | --- | --- |
| `app-card` | `interactive`, `href?`, `padding`, `tone`, `layout` | tone: `surface` (default) · `field` · `emergency` — layout: `column` (default) · `row` | The universal surface: task rail, counters, specialties, médicos, pasos, sedes, reseñas, FAQ, bento tiles. Exactly two projection slots, each declared once in `card.html`: `[cardMedia]` for a photo, the default slot for content — see the comment at the top of that template before touching it |
| `app-stat-card` | `stat: StatItem`, `ringColor`, `delayMs`, `loading` | ringColor: `blue` · `ok` | The counters row ("24 años", "38 especialistas", "96% satisfacción", ...) |
| `app-access-tile` | `item: QuickAccessItem`, `icon`, `loading` | tone comes from `item.tone`: `default` · `emergency` | The task rail's four quick-action tiles, including "Emergencia 24/7" |
| `app-specialty-card` | `specialty: Specialty`, `doctorCountLabel` (default `'médicos'`), `loading` | — | The "¿Qué necesitas atender hoy?" grid, one card per specialty |
| `app-doctor-card` | `doctor: Doctor`, `registrationLabel` (default `'Reg. Senescyt'`), `loading` | — | The "Nuestros médicos" grid |
| `app-review-card` | `review: Review`, `source`, `loading` | — | The reviews grid |
| `app-faq-item` | `item: FaqItem`, `defaultOpen` | — | One accordion row of "Preguntas frecuentes" / "Seguros públicos" |
| `app-price-row` | `service: BookingService`, `note?`, `loading` | — | The list-price vs. plan-price comparison in the agenda demo's booking summary |
| `app-step-card` | `step: HowItWorksStep`, `loading` | — | The "Cómo funciona" three-step grid |
| `app-location-card` | `location: LocationItem`, `image`, `mapHref?`, `loading` | — | A sede card (photo + address block), synthesized from two separate design instances — see below |
| `app-marquee` | `direction`, `durationSeconds` | direction: `left` · `right` | The convenios and reviews-quotes infinite ribbons. Row content is an `<ng-template>`, rendered twice (the second copy `aria-hidden`) |
| `app-segmented` | `options`, `selectedIndex`, `selectedIndexChange` | — | The Especialidades tab switch (Consulta / Control / Telemedicina) |
| `app-photo-frame` | `src`, `alt`, `radius`, `bordered`, `animate`, `transformOrigin`, `referenceCaption?` | radius: `sm` (28px) · `lg` (32px) | Framed photo panels: the hero inset, bento tiles, any Ken-Burns photo |
| `app-skeleton-grid` | `count`, `columns`, `gap`, `variant`, `width`, `height?`, `radius?` | variant: same as `app-skeleton` | Reserves a `count`-item, `columns`-wide grid of placeholder shapes so organisms don't hand-write the same loading `@for` fourteen times |
| `app-error-state` | `message` (default `'No pudimos cargar esta información.'`), `minHeight` (default `'220px'`), `retry` output | — | The retryable failure state for any section fed by a remote resource, so a failed fetch never leaves a section stuck on its skeleton forever. It knows nothing about the resource: the feature container reads `error()` and calls `reload()` on `(retry)` |

## Skeleton contract

Every molecule that renders data sourced from a landing endpoint —
`app-stat-card`, `app-access-tile`, `app-specialty-card`, `app-doctor-card`,
`app-review-card`, `app-step-card`, `app-location-card`, `app-price-row` —
accepts `loading = input(false)` and, when `true`, paints a skeleton built
from `app-skeleton` that reserves the exact height, column count and radii
of its own loaded geometry. `app-faq-item` doesn't: `Faq` is static
boilerplate copy, never actually spinner-loaded in practice, and an
accordion mid-load has no meaningful half-open geometry to reserve — an
organism using it can wrap it in `app-skeleton-grid` while its data is
in flight instead.

## Asset resolution — the single place it happens

**The rule is ownership, not layer**: whichever component renders the
`<img [src]>` applies `| assetUrl`
(`shared/ui/pipes/asset-url.pipe.ts`) exactly once — molecule or
organism, no exception. Parents and feature containers pass the bare
contract filename straight from the JSON and never pipe it themselves.

Today's owners:

- **Molecules**: `app-doctor-card`, `app-specialty-card`,
  `app-step-card`, `app-location-card` (whatever `Locations.gallery`
  entry the organism picked), `app-review-card`'s avatar,
  `app-photo-frame`.
- **Organisms that own an `<img>` directly**: `app-hero-section`
  (the Ken Burns background only — the inset is an `app-photo-frame`,
  which pipes its own `src`), `app-medical-record-bento` (live-screen
  background + the photo benefit tiles), `app-closing-cta`
  (background).

Read the earlier, molecule-only wording literally and you conclude an
organism must never pipe — which is exactly how
`medical-record-bento`'s benefit tiles shipped with a bare
`tablet.jpg` in `src` (a hard 404 against `<base href="/">`) while the
pipe got pushed up into `landing-page`'s template. Hence the
restatement.

The pipe is idempotent — a value that already starts with `/`, `http://`
or `https://` comes back untouched — and that is what makes the rule
above enforceable rather than fragile. Two things follow.

One: the rule can be stated as a flat law ("the renderer pipes, nobody
else") without carving out exceptions for inputs whose provenance the
renderer can't see. `app-photo-frame` is the live case: its `src` is a
generic string, so a caller may legitimately hand it an already-resolved
`/img/...` path or an absolute URL instead of a bare contract filename,
and the frame still pipes unconditionally and still renders the right
thing. `app-location-card`'s `image` is the only other input of that
shape, and it is the narrow case — the organism always feeds it a
`Locations.gallery` entry, so the value is bare by contract. Every
remaining owner reads the filename straight off a `core/models` field
(`Doctor.image`, `Specialty.image`, `Review.avatar`,
`HowItWorksStep.image`, `Hero.images.background`,
`MedicalRecordLiveScreen.image`, `MedicalRecordBenefit.image`,
`Coverage.backgroundImage`), which the contract also guarantees is bare.

Two: idempotence is a safety net for a mistake, not a licence to commit
it. Don't add a second `| assetUrl` one level up from an owner — it is
redundant (if harmless), and it breaks the "one place" rule this note
exists to keep.

## Domain text kept out of hardcoded copy

Two molecules had a fixed clinical-domain string in their template,
which made them unfit for the admin panel to reuse as-is. Both are now
`input()`s with the board's copy as the default, so the visual composition
is unchanged for the landing page:

- **`app-doctor-card` `registrationLabel`** (default `'Reg. Senescyt'`):
  Senescyt is Ecuador's professional-registration regulator — domain data,
  not presentation. `Doctor` (`core/models/doctors.model.ts`) has no field
  for this; the label is a caller-supplied input for now.
- **`app-specialty-card` `doctorCountLabel`** (default `'médicos'`): the
  pill hardcoded the unit word for the `doctorCount` figure. `Specialty`
  (`core/models/specialties.model.ts`) has no unit-label field either.

Neither `doctors.json` nor `specialties.json` carries a label field for
these — flagged for whoever owns `core/models`/the contract: adding
`registrationLabel` to `Doctor` and a `doctorCountLabel` (or similar) to
`Specialty` would let the real data drive the copy instead of a molecule
default. Until then, an organism that needs different wording passes its
own value through the input.

The other thirteen molecules were checked for the same defect and don't
have it — their template strings ("Ver mapa", "Con tu plan", "Reintentar",
"No pudimos cargar esta información.") are generic UI/product copy, not
names of clinical entities or clinic-specific units.

## Tap target: `app-location-card`'s "Ver mapa" link

The "Ver mapa" link rendered at `text-[15px]` with no minimum height or
padding, well under the 44px floor the project LEY requires. Fixed with
a transparent `::after` overlay (`after:absolute after:-inset-3.5
after:content-['']` on a `relative` anchor) that pads the click/tap area
out on every side without adding any visible padding or shifting
surrounding layout — the link still reads exactly as before.

The arithmetic, spelled out because an earlier version of this note got
it wrong: `text-[15px]` is an arbitrary value, so Tailwind emits
`font-size: 15px` and NO line-height (check the built `styles.css` — the
`.text-\[15px\]` rule is one declaration long). Line-height is therefore
inherited, and the only declaration in the chain is preflight's
`html, :host { line-height: 1.5 }` — unitless, so it re-resolves against
this element's own font size: 15 x 1.5 = 22.5px. `base.css` sets no
line-height on `body`, and neither the anchor nor any ancestor inside
`location-card.html` / `card.html` carries a `leading-*` utility. The
anchor is `inline-flex items-center` around a 16px `app-icon` plus that
text run, so the flex line's cross size is the 22.5px line box, not the
icon.

Hit box: 22.5 + 2x14 = 50.5px at `-inset-3.5`, and 22.5 + 2x12 = 46.5px
at `-inset-3` — so `-inset-3` clears 44px too. The 3.5 stays because it
keeps real margin over the floor, not because 3 fails. The earlier claim
that this content box was "18–19px" and that 12px per side "landed at
42–43px, just short" came from assuming the display font's `normal`
metrics apply; they never do when no line-height is declared at all.

The other fourteen molecules were checked for the same defect: every
other interactive element already clears 44px on its own (`app-button`,
`app-chip`, `app-card`'s own `<a>` wrapping large photo/content areas,
`app-segmented`'s `min-h-11` tabs, `app-faq-item`'s `min-h-16` toggle,
`app-access-tile`'s full-tile link), so `app-location-card` was the only
offender.

## Decisions not in the spec

- **`app-card` owns the media-scale + hover-lift entirely**: rather than
  asking every card-shaped molecule to add `transition`/`scale` classes to
  its own projected `<img>`, `app-card` wraps the `[cardMedia]` slot in its
  own scaling element. Consumers project a plain `<img>` (or nothing) and
  get the hover treatment for free — this is also why `overflow: hidden`
  lives on `app-card`'s own root instead of on a separate top-radius on the
  photo: the parent's rounded, clipped box already crops a flush top photo
  correctly, so the `.ph { border-radius: 23px 23px 0 0 }` the boards write
  by hand becomes unnecessary here. An element's own `overflow: hidden`
  doesn't clip its own box-shadow or outline, so this doesn't cost the lift
  shadow or the focus ring.
- **`app-card` `layout: 'row'`**: not a named input in the brief, added
  because the bento section (design/Main.dc.html section 9) needs a
  photo-left / content-right split that the default photo-top stack can't
  express, and the same shell should still own it rather than a bento tile
  reimplementing the card shape.
- **`app-card` `tone: 'field'`**: not called out by name, but `app-faq-item`
  needs it — the design swaps an open question's card background from
  white to `field` (`{{ q0.bg }}` in the board's own runtime), and that's a
  tone, not a one-off inline style.
- **`app-access-tile` icon tile radius**: the board's 44px icon square uses
  `border-radius: 14px`, inside the tokenized 12–16px range but matching
  neither `radius-tile-sm` (12) nor `radius-tile-lg` (16) exactly. Used the
  literal 14px value rather than snapping to either token.
- **`app-marquee`'s mask gradient uses `var(--color-ink)`, not `#000`**:
  the edge-fade `mask-image` needs an opaque middle stop, but `mask-image`
  gradients mask by alpha, not hue — any fully-opaque color produces the
  identical fade, so the literal black had no visual reason to exist.
  Swapped it for the existing `--color-ink` token rather than inventing a
  mask-only token or moving the rule into `shared/tokens/base.css`: unlike
  `.mq-row`'s `sc-l`/`sc-r` keyframes (genuinely reusable system
  animations), this gradient is geometry glue specific to `.mq`'s own
  edges, so it stays in `marquee.css`.
- **`app-marquee`'s gap is not an input**: `shared/tokens/base.css`'s global
  `sc-l` / `sc-r` keyframes hard-code `-100% - 32px` in their `translateX`
  math, so changing the gap per instance would desync the loop. The 32px
  value is fixed to match those keyframes exactly; only `direction` and
  `durationSeconds` are configurable. Composing the two ribbons the design
  shows (convenios, reseñas) still needs two different, non-multiple
  `durationSeconds` (38 and 61) passed in by the caller — the default here
  only covers a single instance.
- **`app-marquee` row content is an `<ng-template>`, not plain projected
  content**: Angular can't clone projected DOM nodes, so a caller can't
  give `app-marquee` one row and have it duplicated. The row is authored
  once inside an `<ng-template>`, and the component renders it twice via
  `NgTemplateOutlet` — the second instance getting `aria-hidden="true"`
  automatically, matching the board's hand-duplicated row exactly without
  making every caller duplicate their own markup.
- **`app-review-card` relative date**: `Review.date` isn't guaranteed to be
  a parseable date in every fixture (the board itself shows a plain
  "07/2026" label). When it parses, it renders relative ("hace 3 meses")
  via `Intl.RelativeTimeFormat`; otherwise the raw string passes through
  unchanged rather than throwing.
- **`app-review-card` `source` input**: the per-review origin badge isn't
  part of the `Review` model (only `ReviewsAggregate.source` carries it at
  the section level), so it arrives as its own input, defaulting to
  `'Google'` to match the only source the board shows.
- **`app-price-row` typed against `BookingService`**: this is the one model
  whose shape already matches the brief's "precio con plan, precio sin
  plan tachado" exactly (`listPrice`, `insurancePrice`, `insurerLabel`).
  The disclaimer note lives one level up on `BookingAvailability`, so it's
  a separate `note` input rather than forcing it onto the service shape.
- **`app-price-row` currency formatting**: uses Angular's `CurrencyPipe` at
  `'code'` display and `'1.0-0'` digits (`USD 12`, no decimals) per the
  brief's explicit instruction to use the pipe at the `es-EC` locale — which
  requires the app to register that locale's data at bootstrap, outside a
  molecule's reach. That dependency is now satisfied: `app.config.ts` calls
  `registerLocaleData(localeEsEc)` and provides `LOCALE_ID: 'es-EC'`. Removing
  either brings back `NG0701: Missing locale data`.
- **`app-location-card` is a synthesis, not a single board instance**: no
  board shows a photo, sede name, address, schedule and a map link
  together on one card — "Instalaciones" (section 10) is a pure photo grid
  with no text, and the footer's sede box (name/address/phone/schedule/
  emergency note) has no photo. This molecule combines the two because the
  brief asks for exactly that combination. `LocationItem` also has no
  per-location photo (`Locations.gallery` is one shared array for the
  whole section) and no map-link field, so `image` and `mapHref` arrive as
  separate inputs alongside the model.
- **`app-doctor-card` reference-photo disclaimer lives in `alt`, not a
  visible caption**: the board states the notice once for the whole grid.
  Repeating a visible "fotografía de referencia" line on every one of four
  cards would be redundant chatter; folding it into each portrait's `alt`
  text (`"Fotografía de referencia — {name}, {specialty}"`) keeps the
  disclaimer attached to the image itself without visual repetition, while
  the section-level caption (an organism's job) still carries it for
  sighted users.
- **Pill sizing inside `app-specialty-card` / `app-doctor-card`**: the
  board's in-card badges are smaller than the standard pill (32–34px tall,
  13px type) — `app-pill` has no `size` variant to match, only `tone`. Used
  the standard `app-pill` as-is rather than hand-rolling a smaller pill
  next to it; flagged as a gap in the atom, not fixed here (atoms are out
  of a molecule's scope to change).
- **`app-segmented` generalizes beyond 3 options**: the board's thumb math
  (`width: calc((100% - 8px) / 3)`, `translateX(i * 100%)`) is written for
  exactly three tabs. Both formulas are expressed in terms of the option
  count and the thumb's own width instead, so the same component slides
  correctly for any number of options, not just three.
- **`app-segmented` is not the ARIA tab pattern**: it used to declare
  `role="tablist"` / `role="tab"` / `aria-selected` and leave
  `aria-controls` to the caller — which no caller ever supplied, and no
  template in the app ever rendered a `role="tabpanel"`. Assistive tech
  announced "tab, 1 of 3, selected" and then found no panel to follow, so
  the pattern was half-declared, which is worse than not declaring it. It
  is now a single-select group of `aria-pressed` toggle buttons — the same
  contract `app-chip` already uses — with the sliding thumb marked
  `aria-hidden` and every button in the tab order. Arrow/Home/End still
  work as an extra. Completing the tab pattern instead would mean adding a
  `panelId` input here plus `role="tabpanel"` + `aria-labelledby` in every
  consumer; if that is ever wanted, do the whole thing, not half.

## Not requested, not built

Nothing in the brief was skipped.
