---
name: Where Them Logs App
description: A warehouse aisle for log file locations - flat printed racking, signal cyan, two voices.
colors:
  ink: "#111311"
  ink-raised: "#1b1e1b"
  ink-rule: "#2e322d"
  hivis: "#22d3ee"
  hivis-deep: "#0e7c90"
  hivis-ink: "#0a4a55"
  bone: "#e8e4da"
  bone-dim: "#a8a496"
  bone-faint: "#8a8779"
  zone-win: "#2952cc"
  zone-mac: "#e8e4da"
  zone-lnx: "#e4533b"
typography:
  display:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.6rem, 11.35vw, 10.5rem)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.014em"
    fontVariation: "wdth 62"
  headline:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.5rem, 3.4vw, 2.4rem)"
    fontWeight: 900
    lineHeight: 1.02
    letterSpacing: "normal"
    fontVariation: "wdth 70"
  title:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.05rem, 1.5vw, 1.3rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.005em"
    fontVariation: "wdth 78"
  body:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(0.95rem, 1.15vw, 1.1rem)"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  path:
    fontFamily: "Spline Sans Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "clamp(0.85rem, 1.05vw, 0.97rem)"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "normal"
    fontFeature: "tabular-nums"
  label:
    fontFamily: "Spline Sans Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.16em"
    fontFeature: "tabular-nums"
rounded:
  none: "0"
spacing:
  hair: "0.35rem"
  tight: "0.6rem"
  cell: "0.85rem"
  bay: "clamp(0.9rem, 1.6vw, 1.25rem)"
  gutter: "clamp(1rem, 3.2vw, 3.25rem)"
  aisle: "clamp(2rem, 4vw, 3.25rem)"
components:
  scanner-bar:
    backgroundColor: "{colors.hivis}"
    textColor: "{colors.ink}"
    typography: "{typography.path}"
    rounded: "{rounded.none}"
    padding: "0 clamp(0.9rem, 1.6vw, 1.25rem)"
    height: "clamp(66px, 7.2vw, 86px)"
  plate:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bone}"
    rounded: "{rounded.none}"
    padding: "0.85rem clamp(0.9rem, 1.6vw, 1.25rem) 0.7rem"
  plate-hover:
    backgroundColor: "{colors.ink-raised}"
    textColor: "{colors.bone}"
  plate-confirmed:
    backgroundColor: "{colors.hivis}"
    textColor: "{colors.ink}"
  button-primary:
    backgroundColor: "{colors.hivis}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.65rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.ink}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.bone}"
    rounded: "{rounded.none}"
    padding: "0.65rem 1rem"
  button-consent:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.6rem 1.4rem"
    width: "132px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.bone-dim}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.14rem 0.4rem"
  chip-arch:
    backgroundColor: "{colors.bone-dim}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.14rem 0.4rem"
  toggle:
    backgroundColor: "transparent"
    textColor: "{colors.bone-dim}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.24rem 0.5rem"
  toggle-pressed:
    backgroundColor: "{colors.hivis}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.24rem 0.5rem"
  zone-tab:
    backgroundColor: "transparent"
    textColor: "{colors.bone-dim}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.7rem 1.15rem"
  zone-tab-current:
    backgroundColor: "{colors.hivis}"
    textColor: "{colors.ink}"
---

# Design System: Where Them Logs App

## Overview

**Creative North Star: "The Location Code"**

A log path is a location code, so the site is a wall of warehouse racking rather than a documentation page. Painted-steel near-black ground, bone label stock, high-vis signal cyan owning whole regions, and hazard tape banding the top and bottom edges. Structure comes from stencilled hairlines and banding hard against a shared grid - never from a card floating on a background. Density is the material: content runs edge to edge, the aisle sign shouts at a scale the web rarely permits, and nothing is padded to look calm.

The surfaces are printed, not rendered. There are no gradients anywhere except the 45° repeating hard-stop stripe that draws hazard tape, no shadows of any kind, no radii, no translucency, no blur. Every colour is a flat fill of one value. This is what keeps signal cyan reading as printed vinyl instead of neon: it is a solid field with dead-black type on it, never a light source.

Two voices carry everything, strictly assigned. Archivo (self-hosted variable, weight 100-900, width 62-125%) is the human voice - headings, prose, app names, button words. Spline Sans Mono (self-hosted variable, weight 300-700) is the machine voice - paths, codes, counts, filter values, and every stencilled label. The build ships this assignment without exception, and it is what makes a path look like a fact rather than a sentence.

**Key Characteristics:**
- Flat printed surfaces: zero gradients (except hazard stripes), zero shadows, zero radii
- Signal cyan owns whole regions - a bar, a tab, a plate - never a hairline highlight
- Structure is 1px/2px stencilled rules and full-bleed banding, never bordered cards
- Two typefaces, hard-assigned to human vs machine content
- Every signal carries colour, shape, and text together
- One authored motion moment; nothing else animates

## Colors

A painted-steel dark ground with bone label stock, one high-vis signal, and three zone codes that behave like painted floor markings.

### Primary
- **Signal Cyan** (`hivis`): The high-vis field. It commits at page scale - the whole scanner bar, the current zone tab, a confirmed plate, a primary button, the hazard stripe. Type on it is always near-black `ink` or the deep teal `hivis-ink` for stencilled labels. **This value is a user pin.** The direction was approved with safety yellow and the user replaced it mid-build with cyan, with the layout explicitly unchanged. Do not "restore" the yellow.
- **Deep Cyan** (`hivis-deep`): Underline and rule colour for links on the bone privacy sheet, where full-strength cyan would be too light on light stock.
- **Cyan Ink** (`hivis-ink`): The stencilled-label colour used on top of a cyan field (scanner bar labels, current-tab hints, hover state on pick-list rows). It is the on-cyan equivalent of `bone-dim`, not a second accent.

### Neutral
- **Painted Steel** (`ink`): The page ground, and the text colour on every cyan or bone field.
- **Raised Steel** (`ink-raised`): Hover fill on plates and links, section header bands, the consent bar. A one-step tonal lift, the only depth device in the system.
- **Rule Steel** (`ink-rule`): Every hairline and heavy rule, chip and toggle borders, scrollbar thumb. Structure colour, never text.
- **Label Stock** (`bone`): Body and heading text on the dark ground, path text, the privacy sheet ground, and the hover fill of the primary cyan button.
- **Dim Stock** (`bone-dim`): Secondary prose, unselected tabs and toggles, chip text, and the fill of architecture chips.
- **Faint Stock** (`bone-faint`): The quietest text role - vendor names, path notes, footer seed copy. Raised to `#8a8779` specifically so this role still clears 4.5:1 on `ink`. It is the floor; nothing dimmer exists.

### Tertiary
- **Cobalt** (`zone-win`), **Bone** (`zone-mac`), **Hazard Red** (`zone-lnx`): Platform zone codes. Used as solid blocks and bands only - the vertical band down a plate's left edge and the active zone tab.

### Named Rules
**The Whole Region Rule.** Signal cyan is committed at region scale - a full-width bar, a whole tab, an entire plate - or not used at all. It never appears as a 1px accent line, a dot, a gradient stop, or a glow.

**The Flat Print Rule.** Near-black on cyan is printed vinyl, not a light source. No `box-shadow`, no `text-shadow`, no `filter: drop-shadow`, no colour-matched glow, no gradient on any cyan surface. The palette invites neon; the world refuses it.

**The Path Stays Bone Rule.** Colour never touches path text. A path is `bone` at full contrast on the dark ground, or `ink` on the confirmed cyan plate. Never cyan, never a zone colour, never dimmed, never syntax-highlighted.

**The Zone-Never-Speaks Rule.** `zone-win` and `zone-lnx` are block-and-band colours only and must never carry body text. Zone colour appears as a filled band with a code printed on it in `bone` or `ink`.

**The Three-Part Signal Rule.** Colour never carries a signal alone. Every platform zone ships a colour, a distinct SVG fill pattern in `ZoneSwatch` (WIN one horizontal bar, MAC two diagonals, LNX two horizontal bars, ALL a cross), and a three-letter text code. The pattern is part of the token, not decoration.

## Typography

**Display Font:** Archivo - self-hosted variable, `wght 100-900`, `wdth 62-125%` (with Helvetica Neue, Arial)
**Body Font:** Archivo, same file
**Label/Mono Font:** Spline Sans Mono - self-hosted variable, `wght 300-700` (with ui-monospace, SFMono-Regular, Menlo)

**Character:** Archivo compressed hard and set heavy reads as painted aisle signage; Spline Sans Mono is a clean, tabular machine hand that keeps paths and counts scannable at small sizes over a degraded remote session. `font-synthesis-weight: none` - width and weight come from the variable axes, never from faux bolding.

### Hierarchy
- **Display** (900, `wdth 62%`, clamp 2.6rem-10.5rem, line-height 0.86, uppercase): The aisle sign - the page's one shouted line, hard to the left margin. Also the privacy sheet's H1 at `wdth 64%`.
- **Headline** (900, `wdth 70%`, clamp 1.5rem-2.4rem, uppercase): Empty-state and no-results headings.
- **Title** (800, `wdth 78%`, clamp 1.05rem-1.3rem, uppercase): App names on a label plate; the header wordmark at 0.8125rem; section headings on the privacy sheet at `wdth 74%`.
- **Body** (400, clamp 0.95rem-1.1rem, line-height 1.5-1.65): Prose. Capped at 62ch in the aisle sign lede, 68ch on the privacy sheet, 84ch in the footer seed note.
- **Path** (mono 500, clamp 0.85rem-0.97rem, line-height 1.45): Log paths. `word-break: break-word` plus `overflow-wrap: anywhere` so a long Windows path wraps rather than scrolls, and `user-select: all` so one click grabs the whole path.
- **Label** (mono 600, 0.6875rem, letter-spacing 0.16em, uppercase, tabular): The stencilled `.tag` - section headings, zone codes, chips, toggles, hints, footer nav. The most-used role in the system.

### Named Rules
**The Two Voices Rule.** Archivo for anything human - headings, prose, app names, button words. Spline Sans Mono for anything machine-true - paths, codes, counts, filter values, entry totals, and every `.tag` stencil label. There is no third face, and no piece of content gets to choose.

**The Tabular Figures Rule.** Every number the machine produced - entry counts, zone counts, the 046 bay figure - is set in mono with `tabular-nums`, so figures do not shift width when they change.

## Layout

One shared page grid, everything hard against it. Horizontal inset is a single `gutter` token (clamp 1rem-3.25rem) applied by the `.rack` wrapper; chrome elements (header, zone banding, hazard stripes, footer) run full-bleed edge to edge and use the gutter only on their first/last cell, so the banding touches the viewport edge.

Home splits below the aisle sign into an asymmetric two-column rack: results column `minmax(0,1fr)` plus a fixed 300px pick-list gutter, separated by a single hairline rather than a gap. The results page inverts the emphasis: a 264px sticky filter rail, then the plate column. Both collapse to a single column at 1080px, where the results rail moves *below* the plates (`order: 2`) so results are never buried and the filter summary becomes a sticky disclosure. At 720px the header wraps its nav to a full-width row of equal-width cells, path rows drop from three columns to stacked, and the plate's zone band narrows from 46px to 34px.

Vertical rhythm is clamped rather than stepped: `bay` (clamp 0.9-1.25rem) for cell padding, `aisle` (clamp 2-3.25rem) for the space between major racks. Cells inside plates are tight - 0.5rem block padding on a path row - because density is the point. There are no gaps between plates; they are separated by a hairline and stack flush like labels on an upright.

**The No Gap Rule.** Repeated elements share a rule, they do not share a gap. Plates, path rows, pick-list rows, rack columns, and header nav cells are all `gap: 0` with a 1px divider. Whitespace between siblings is a defect in this world.

## Elevation & Depth

There are no shadows in this system. None. Depth is a single one-step tonal lift: `ink-raised` on top of `ink`, used for hover fills, section header bands, and the consent bar. Everything else is a plane, and separation comes from a 1px (`--rule`) or 2px (`--rule-heavy`) stencilled line in `ink-rule` - 2px marks a structural break (the band under the zone tabs, the top of the results grid, a rack head), 1px marks a division within a rack.

Nothing floats. Overlays are docked to an edge and full-bleed: the type-ahead rack is flush under the scanner bar with `border-top: 0` so it reads as the same object continuing; the consent bar is pinned to the bottom inset-inline 0 with a hairline top rule, and the body reserves space for it rather than letting it cover content.

### Named Rules
**The No Shadow Rule.** `box-shadow`, `text-shadow`, `drop-shadow`, and `backdrop-filter` do not appear in this system at any elevation, on any state, in any world variant. If something needs to separate, give it a rule or a tonal step.

**The Docked Overlay Rule.** Anything that appears over the page docks to an edge and spans it. No centred modal, no floating popover, no `⌘K` dialog, no toast.

## Shapes

Radius is zero everywhere - plates, buttons, chips, inputs, toggles, the logo mark, the focus ring. Every corner is cut square, because a label plate is die-cut and a rack upright is folded steel.

Borders are rules, not outlines: elements more often carry a single `border-left` or `border-bottom` than a full box. Chips and toggles are the exception and carry a full 1px `ink-rule` box; scope chips distinguish themselves with `border-style: dashed` rather than a second colour. Selection and confirmation use `outline` with negative `outline-offset` so the marker sits inside the plate's own footprint and does not shift the grid.

Recurring geometry: the vertical zone band down a plate's left edge with its code set in `writing-mode: vertical-rl` rotated 180°; the single shared vertical rule down the path stack so every path in a plate aligns into one scannable column; the 45° hard-stop hazard stripe (12px cyan / 12px ink, 10px tall) at the very top of the header and the top of the footer.

Icons are an authored 24-unit-grid SVG set: stroke width 2, `butt` caps, `miter` joins, `fill: none`, colour inherited. Cut vinyl, not a rounded UI kit. The mark is a bin location plate - bone ground, cyan band across the middle, code bars top and bottom in ink.

**The Square Corner Rule.** Radius is 0. There is no `sm`/`md`/`lg` scale to reach for; adding one breaks the world.

## Components

### Buttons
- **Shape:** Square (0 radius), no border on the primary.
- **Primary:** Solid signal cyan ground, near-black text, mono uppercase label, padding 0.65rem 1rem. Used for the single forward action in an empty state and for "Request an app" in the header.
- **Hover:** Ground swaps cyan → bone (`.btn:hover`), text stays ink. Colour swap only; nothing lifts, scales, or glows.
- **Ghost:** Transparent ground with a 2px `ink-rule` box, bone text; hover fills `ink-raised` and lightens the border to `bone-dim`.
- **Consent pair:** Both consent buttons are identical bone plates, `min-width: 132px`, same weight and padding - equal weight by construction, not by wording. Do not make one of them ghost.

### Chips
- **Style:** 1px `ink-rule` box, `bone-dim` mono uppercase label, padding 0.14rem 0.4rem. These are installer-type tags (MSI, EXE, DEB, PKG).
- **Architecture variant:** Inverted - solid `bone-dim` ground, `ink` text, weight 700. Architecture reads louder than installer type because it is the differentiator.
- **Scope variant:** Same as base with a dashed border (PER-USER, PER-MACHINE).
- **On a confirmed plate:** Chip borders drop to `rgba(17,19,17,0.32)` and the architecture chip inverts again to ink-on-cyan.

### Cards / Containers
There are no cards. The label plate is the container primitive: a two-column grid (46px zone band + body), flat `ink` ground, separated from its neighbours by a `border-bottom` hairline that is removed on the last child. Hover fills `ink-raised`. Keyboard/URL selection draws a 2px cyan outline at `-2px` offset. No radius, no shadow, no margin between plates.

### Inputs / Fields
The scanner bar is the only text input. It is a full-width solid cyan bar, 66-86px tall, with a transparent borderless mono input in near-black and a near-black caret; the placeholder is `hivis-ink` at full opacity. Focus is `:focus-within` on the bar drawing a 3px bone outline inset `-3px` - the bar itself is the focus target, not the input. The browser's search-cancel and search-decoration pseudo-elements are reset to `none`; the field draws its own clear control, an ink glyph that inverts to cyan-on-ink on hover. Keyboard hints (`/` to scan, `↵` for all results) print as bordered `kbd` keys and hide on coarse pointers and below 860px.

Global focus for everything else is `3px solid` signal cyan at `2px` offset.

### Navigation
The header is a single 58px row: mark plus stacked wordmark in condensed Archivo caps, bay code, then nav cells divided by `border-left` hairlines with no gap. "Request an app" is the one cyan cell. Hover on a plain cell fills `ink-raised`; hover on the cyan cell swaps to bone. Below 720px the nav becomes a full-width second row of equal-flex cells.

Zone banding sits directly beneath as a horizontally scrollable band (scrollbar hidden) with a 2px bottom rule. Each tab carries its swatch, its three-letter code, and its count. The current tab fills with its own zone colour and switches to weight 700; WIN fills cobalt with bone text, MAC and LNX and ALL take ink text.

### Scan-to-Confirm Plate (signature)
The signature interaction. Activating a path row's SCAN control inverts the **entire plate** to solid signal cyan for 1.8s: name, paths, notes, labels, and chips all flip to `ink`, internal rules drop to 32% ink, and a stencilled `plate__confirm` reading prints into the plate's own header line ("…on the clipboard") with a check glyph. It returns on its own. The path stays fully legible in black throughout - that legibility is the whole point of the confirmation.

This is deliberately not a toast, not a row flash, not a button label swap, not a tooltip. State prints as label text in the system's own voice, in place.

**The One Motion Rule.** The system has exactly one authored motion moment: `rack-in` - a `clip-path: inset(0 100% 0 0)` wipe plus a 6px rise over 460ms on `cubic-bezier(0.16, 1, 0.3, 1)`, staggered 42ms per item via `--i`, applied to the plate stack on query change from an already-visible default. The confirm reading reuses the same keyframe at 320ms. Nothing else animates. Colour/background transitions are 120ms linear state swaps, not motion. Adding scattered hover lifts, scale, fade-ins, or scroll reveals breaks the system.

## Do's and Don'ts

### Do:
- **Do** write interface copy in plain words - search, add, delete, platform, log locations. The warehouse lives in the visuals (racking, plates, zone colours), never in vocabulary a visitor has to decode.
- **Do** commit signal cyan (`#22d3ee`) at region scale - a whole bar, tab, plate, or button - with near-black type on it.
- **Do** print every path in `bone` (or `ink` on the confirmed cyan plate) at full contrast, in Spline Sans Mono.
- **Do** give every zone all three signals: colour, its `ZoneSwatch` fill pattern, and its three-letter code.
- **Do** separate repeated elements with a 1px `ink-rule` hairline (2px for a structural break) and `gap: 0`.
- **Do** set anything machine-true - paths, codes, counts, filter values, `.tag` labels - in Spline Sans Mono with tabular figures, and anything human in Archivo.
- **Do** keep every text role at or above `bone-faint` (`#8a8779`), which is the 4.5:1 floor on `ink`.
- **Do** dock overlays to an edge and span it full-bleed, the way the type-ahead rack and consent bar do.
- **Do** reuse `rack-in` if a new list needs entrance motion, staggered by `--i`.

### Don't:
- **Don't** restore the safety yellow. The cyan is a user pin made mid-build with the layout explicitly unchanged.
- **Don't** add glow, gradient, `text-shadow`, or `box-shadow` to a cyan surface - or to anything else. The palette invites neon and the world refuses it.
- **Don't** tint, dim, or syntax-highlight path text, or let a zone colour touch any body text.
- **Don't** introduce a corner radius. Radius is 0 system-wide.
- **Don't** float a card, centre a modal, or open a `⌘K` dialog; nothing detaches from the grid.
- **Don't** add a third typeface, or set a path in Archivo, or set prose in mono.
- **Don't** add hover lifts, scale transforms, fade-ins, or scroll-triggered reveals. One authored motion moment is the whole grammar.
- **Don't** announce state with a toast or a temporary button label. State prints in place, as label text, in the system's own voice.
- **Don't** make the consent decline visually lighter than the accept; they are identical plates by construction.
