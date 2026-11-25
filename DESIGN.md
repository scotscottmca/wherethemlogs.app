---
name: Where Them Logs App
description: The Folder - a calm lookup page with one manila tab colour, paths in mono, light and dark from the device.
colors:
  bg: "#f6f6fa"
  bg-dark: "#131520"
  surface: "#ffffff"
  surface-dark: "#1b1e2e"
  line: "#d9dae6"
  line-dark: "#2e3247"
  hover: "#eeeef6"
  hover-dark: "#232740"
  chip: "#ecedf4"
  chip-dark: "#24283b"
  fg: "#191b2a"
  fg-dark: "#ecebf3"
  muted: "#5b5e75"
  muted-dark: "#a3a5bb"
  faint: "#63667c"
  faint-dark: "#9092a9"
  accent: "#7a4f00"
  accent-dark: "#f4c95d"
  tab: "#ffd978"
  tab-dark: "#f4c95d"
  tabhi: "#ffe6a3"
  tabhi-dark: "#ffdd85"
  tabfg: "#2a2000"
  tabfg-dark: "#231a00"
  tabdim: "#5c4a12"
  tabdim-dark: "#5c4a12"
  tabedge: "#a67c00"
  tabedge-dark: "#f4c95d"
  zone-win: "#2952cc"
  zone-win-dark: "#5b7fe8"
  zone-mac: "#5b5e75"
  zone-mac-dark: "#a3a5bb"
  zone-lnx: "#c8442e"
  zone-lnx-dark: "#e4533b"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.3rem, 7vw, 4.25rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.6rem, 4vw, 2.4rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "tabular-nums"
  path:
    fontFamily: "Spline Sans Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.9rem"
    fontWeight: 500
    lineHeight: 1.45
  code-tag:
    fontFamily: "Spline Sans Mono, ui-monospace, monospace"
    fontSize: "0.74rem"
    fontWeight: 500
    lineHeight: 1.35
rounded:
  r: "10px"
  r-sm: "6px"
spacing:
  gutter: "clamp(1rem, 3.2vw, 3.25rem)"
  card: "clamp(0.9rem, 1.6vw, 1.25rem)"
  stack: "0.6rem"
components:
  search-field:
    backgroundColor: "{colors.tab}"
    textColor: "{colors.tabfg}"
    rounded: "{rounded.r}"
    padding: "0 0.4rem 0 1rem"
    height: "58px"
  search-button:
    backgroundColor: "{colors.tabfg}"
    textColor: "{colors.tab}"
    rounded: "{rounded.r-sm}"
    padding: "0 1.1rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.r}"
    padding: "1rem clamp(0.9rem, 1.6vw, 1.25rem) 0.85rem"
  path-block:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.fg}"
    typography: "{typography.path}"
    rounded: "{rounded.r-sm}"
    padding: "0.45rem 0.7rem"
  tree-leaf:
    backgroundColor: "{colors.tab}"
    textColor: "{colors.tabfg}"
    typography: "{typography.path}"
    rounded: "{rounded.r-sm}"
    padding: "0.12rem 0.55rem"
  copy-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.r-sm}"
    padding: "0.4rem 0.8rem"
  copy-confirm:
    backgroundColor: "{colors.tab}"
    textColor: "{colors.tabfg}"
    rounded: "{rounded.r-sm}"
    padding: "0.2rem 0.55rem"
  button-primary:
    backgroundColor: "{colors.tab}"
    textColor: "{colors.tabfg}"
    rounded: "{rounded.r-sm}"
    padding: "0.6rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.tabhi}"
    textColor: "{colors.tabfg}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    rounded: "{rounded.r-sm}"
    padding: "0.6rem 1rem"
  button-ghost-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.fg}"
  button-consent:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    rounded: "{rounded.r-sm}"
    padding: "0.55rem 1.4rem"
    width: "132px"
  button-consent-hover:
    backgroundColor: "{colors.fg}"
    textColor: "{colors.bg}"
  header-request-link:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.r}"
    padding: "0.35rem 0.85rem"
  platform-link:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.r}"
    padding: "0.3rem 0.8rem"
  platform-link-current:
    backgroundColor: "{colors.tab}"
    textColor: "{colors.tabfg}"
  toggle:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.r-sm}"
    padding: "0.22rem 0.55rem"
  toggle-pressed:
    backgroundColor: "{colors.tab}"
    textColor: "{colors.tabfg}"
  type-tag:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.muted}"
    typography: "{typography.code-tag}"
    rounded: "4px"
    padding: "0.12rem 0.45rem"
  type-tag-arch:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.fg}"
---

# Design System: Where Them Logs App

## Overview

**Creative North Star: "The Folder"**

A log path is a folder location, so the site is a folder you look things up in. The ground is calm: pale cool grey in light, deep navy in dark. On it sits one manila tab colour, used for every fill the visitor acts on: the search field, the current filter, the main button, the file at the end of a path. Everything else is white or navy cards with hairline borders, grey text, and paths set in mono.

The page is simple on purpose. The visitor already knows the app name and is usually in the middle of fixing something. One search field does the work, the answer appears under it with a copy button beside each path, and nothing competes with that. There are no gradients, no uppercase labels, no condensed type, and one soft shadow that only appears under things that float over the page.

Light and dark are both first-class. Each follows the visitor's device and there is no switch. Every colour is a token with a value for each theme, so a new screen that uses only tokens is correct in both without extra work.

The admin pages run on the same tokens and the same parts (cards, the manila field, toggles, buttons), laid out denser: a list rail beside the record, rows split by hairlines.

**Key Characteristics:**
- One manila tab colour for every fill you act on, always with dark brown text on it
- Calm ground, surface cards with hairline borders, gaps between cards
- Bricolage Grotesque for words, Spline Sans Mono for paths, type tags and keys
- Soft corners at 10px and 6px; flat fills with no gradients
- Light and dark from the device, every colour a token with both values
- One motion: cards rise and fade in once

## Colors

A cool grey or navy ground, one warm manila signal, and three small platform markers. Each token below has a light value and a dark value in the frontmatter (the dark one carries the `-dark` suffix there; in the stylesheet it is the same custom property redefined under the dark colour scheme).

### Primary
- **Manila Tab** (`tab`): The folder tab. Every fill the visitor acts on or that marks the current choice: the search field and its tab, the current platform link, pressed toggles, the primary button, the file leaf in a folder tree, the "copied" confirmation, the skip link, text selection.
- **Tab Highlight** (`tabhi`): Hover fill for the primary button. Nothing else.
- **Tab Ink** (`tabfg`): The dark brown text that always sits on a tab fill. Also the fill of the Search button inside the field.
- **Tab Dim** (`tabdim`): The quiet text on a tab fill: the placeholder, hints and clear control inside the search field, counts on a current admin row.
- **Tab Edge** (`tabedge`): A 1px edge on the search field and its tab. In light the tab fill barely differs from the ground, so the edge is what marks the field; in dark it equals the fill and disappears.
- **Accent** (`accent`): The colour for coloured text and thin signals on the ground: links, the slashes in the headline, the mark's middle bar, focus rings, the selected-card outline, hover borders, version tags. Dark amber in light, manila in dark.

### Tertiary
- **Windows Blue** (`zone-win`), **macOS Grey** (`zone-mac`), **Linux Red** (`zone-lnx`): Platform markers. Small filled squares only, each with its own line pattern and sitting beside the platform's name or code.

### Neutral
- **Ground** (`bg`): The page.
- **Surface** (`surface`): Cards, lists, panels, menus, the consent bar, copy buttons, the outlined header link.
- **Line** (`line`): Every hairline border and divider, the folder-tree guide line, scrollbar thumb.
- **Hover** (`hover`): Hover fill for list rows, menu items and ghost buttons.
- **Chip** (`chip`): The quiet fill behind a path, a type tag, a platform label, inline code, table headers.
- **Text** (`fg`): Headings, body text, path text.
- **Muted** (`muted`): Secondary text: labels, the line under the headline, unselected filters, notes.
- **Faint** (`faint`): The quietest text: vendor names, "wrong path" links, clear links.

### Named Rules
**The Token Pair Rule.** Every colour is a token with a light value and a dark value. No hex, rgb or named colour is written in a component. If a new colour is needed, add the token with both values first.

**The Tab Fill Rule.** `tab` is for fills only and always carries `tabfg` text (with `tabdim` for the quiet text on the same fill). It is never a text colour on the ground, because manila on pale grey cannot be read. The one inverse is the Search button inside the field: a `tabfg` fill with `tab` text, so the pair is the same.

**The Accent Text Rule.** Coloured text uses `accent`. In dark, `accent` and `tab` happen to share a value; in light they do not. Keep them as two tokens and never swap one for the other.

**The Device Theme Rule.** Themes follow the device's colour scheme. There is no theme switch, no stored preference and no theme class to set.

**The Marker Rule.** Platform colours are small blocks only and never carry text. A platform is always also named in words or by its code, and its marker has its own pattern, so colour is never the only signal.

## Typography

**Display Font:** Bricolage Grotesque - self-hosted variable, weight 200-800 (with Helvetica Neue, Arial)
**Body Font:** Bricolage Grotesque, same files
**Label/Mono Font:** Spline Sans Mono - self-hosted variable, weight 300-700 (with ui-monospace, SFMono-Regular, Menlo)

**Character:** Bricolage Grotesque is a friendly grotesque with a little irregularity, set bold and tight for headings and plain for everything else. Spline Sans Mono is a clean machine hand that makes a path read as a fact you can paste. Faux bold is off; weight comes from the variable axis.

### Hierarchy
- **Display** (700, clamp 2.3rem-4.25rem, line-height 1, tracking -0.03em): The home headline, the site name drawn as a path with accent slashes, lower case. Reading-page titles use the same role at clamp 2.2rem-3.6rem.
- **Headline** (700, clamp 1.6rem-2.4rem, line-height 1.1, tracking -0.02em): Page titles on results, app and vendor pages, and "nothing found" headings.
- **Title** (700, 1.15rem, line-height 1.2, tracking -0.01em): The app name on a card. Section headings on reading pages run clamp 1.15rem-1.4rem.
- **Body** (400, 1rem, line-height 1.5; 1.65 on reading pages): Prose. It wraps with the window.
- **Label** (500, 0.8125rem, line-height 1.4, tabular figures, sentence case): Section names, counts, qualifiers, footer links, button words. Muted by default.
- **Path** (mono 500, 0.9rem, line-height 1.45): Log paths. Wraps anywhere rather than scrolling, keeps one path per line when a location lists several, and selects whole on one click.
- **Code tag** (mono 500, 0.72rem-0.78rem): Installer and architecture tags, keyboard keys, the path preview in suggestions.

### Named Rules
**The Two Faces Rule.** Bricolage Grotesque for words. Spline Sans Mono for what the machine wrote or reads: paths, file names, type tags, keys, inline code. Labels and counts are words, so they stay in Bricolage with tabular figures.

**The Sentence Case Rule.** No uppercase transforms and no letter-spaced labels. Labels are plain words in sentence case; only headings carry tracking, and it is negative.

**The Open Measure Rule.** Text blocks are never width-capped in `ch`. Prose wraps with the window or its column; a column is sized by the layout (in rem or grid tracks), not by a character count on the text. The file list under a path sizes its columns to the longest file name; that is a layout track, not a text cap.

## Layout

The page wrapper gives one horizontal inset, `gutter` (clamp 1rem-3.25rem), shared by header, main and footer. The header is a single slim row (min-height 60px): mark and name on the left, links on the right, wrapping when it runs out of room.

Home is one centred column (max 46rem): headline, one grey line, search field, platform filter, a row of recently added apps, a short note. Results, app and vendor pages use the full width inside the gutter: a title row, filters above, then a stack of cards.

Repeated things are separated by space, not shared rules: cards sit 0.6rem-0.9rem apart, each with its own border. Inside a container (a list of apps, the suggestions) rows are split by hairlines.

Reading pages (privacy, terms, docs, guides) are two columns: a sticky head column up to 21rem with the title, and the body beside it. Below 1000px they stack and the head stops sticking.

Below 720px: a path and its copy button stack, keyboard hints hide (also on touch pointers), suggestion rows drop vendor and platform, and the two consent buttons share the row equally. The consent bar is fixed to the bottom and the page reserves room for it.

Admin is a 260px sticky list rail beside the record; below 1080px the record comes first and the list follows.

## Elevation & Depth

Flat by default. Depth is one tonal step, `surface` on `bg` with a `line` hairline, and `hover` for rows under the pointer.

### Shadow Vocabulary
- **Float** (`--shadow`: `0 4px 16px rgba(25, 27, 42, 0.12)` in light, `0 8px 22px rgba(0, 0, 0, 0.45)` in dark): Only for layers that sit over other content: the suggestions under the search field, the share menu, the fixed consent bar.

### Named Rules
**The One Shadow Rule.** There is one shadow token and it marks one thing: this layer floats over the page. Cards, buttons and hover states never take a shadow.

## Shapes

Soft corners on two tokens: 10px (`r`) for cards, the search field, platform links, panels and menus; 6px (`r-sm`) for buttons, inputs, toggles, path blocks, tree leaves and the copy confirmation. The smallest tags, keys, inline code and app icons use a literal 4px.

Borders are full 1px hairlines in `line`. A scope tag (per-user, per-machine) is told apart by a dashed border, not a second colour.

Two recurring forms carry the world:
- **The folder tab.** A small manila tab stands up from the top left of the search field, rounded on its top corners only, and the field squares off the corner beneath it so the two read as one folder. This form belongs to the search field. It is not a general pattern for a small label above content.
- **The tree line.** Nested folders indent 1.1rem behind a 1.5px `line` guide. File lists under a path use the same guide.

Icons are one authored set on a 24-unit grid: stroke 2, butt caps, no fill, colour inherited. The mark is a spine with three bars, the middle one in `accent`.

Focus is a 2px `accent` outline at 2px offset. On a tab fill the outline is `tabfg`, and the search field as a whole takes a 2px `fg` outline when anything inside it has focus.

## Components

### Buttons
- **Shape:** Gently rounded (6px), no border on the primary.
- **Primary:** Manila fill, tab-ink text, weight 600, padding 0.6rem 1rem. Hover lightens the fill to `tabhi`. One per empty state or main action.
- **Ghost:** Transparent with a 1px `line` border and `fg` text; hover fills `hover` and darkens the border to `muted`.
- **Copy:** A small surface button with a hairline border, a copy icon and the word Copy; hover turns the border `accent`. One per path, to the right of it.
- **Consent pair:** Two identical outlined buttons (1px `fg` border, min-width 132px, weight 600); hover inverts to `fg` fill with `bg` text. Accept and Decline are equal by construction. Never make one of them the manila button.

### Chips
- **Platform filter:** Four links (All platforms, Windows, macOS, Linux), each with its count, 10px corners and a hairline border. The current one fills manila with tab-ink text at weight 600.
- **Filter toggles:** Smaller, 6px corners, same idea: muted with a hairline at rest, manila when pressed.
- **Type tags:** Mono on a `chip` fill, 4px corners, muted text. Architecture tags (x64, arm64) take `fg` at weight 600. Scope tags drop the fill for a dashed hairline.
- **Card qualifiers:** The platform name on a `chip` fill; variant in a hairline box; version in an `accent` hairline box with `accent` text.

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** `surface` on the `bg` ground.
- **Shadow Strategy:** None. See Elevation.
- **Border:** 1px `line`. A card reached by keyboard or URL takes a 2px `accent` outline inside its own edge.
- **Internal Padding:** 1rem block, `card` inline (clamp 0.9rem-1.25rem), 0.8rem between its parts.
- **Result card:** One per app, per platform, per variant. Top row: icon, app name (links to the app page), platform, variant, version, vendor. Then each location as a muted label, the path in a `chip` block with any note under it in body type, and a copy button. Foot: type tags on the left, a faint "wrong path" link on the right.
- **Lists and panels:** A list of apps is one surface container with hairline-split rows that fill `hover`. Reading panels on app pages are the same surface card with body text.

### Inputs / Fields
- **Search field:** The one manila field: 58px tall, 10px corners, the "Find an app" tab standing on its top left corner, a borderless input in tab-ink at 1.1rem weight 500, placeholder in `tabdim`, the field's own clear control, and a dark Search button inside on the right. Keyboard hints sit under it as muted text with mono keys.
- **Focus:** The whole field takes a 2px `fg` outline at 2px offset.
- **Suggestions:** A surface panel floating 6px under the field with the Float shadow. A status line and "all results" link on top, then the best match as a full result card (borderless, with working copy buttons), then other matches as rows: name, vendor, a mono path preview, platforms. The row under the cursor fills `hover`.

### Navigation
- **Header:** The mark and the site name at weight 700; links in `muted` at 0.9rem that turn `fg` on hover. "Request an app" is the one outlined link (surface fill, hairline, 10px corners; hover border `accent`). A share icon opens a small floating menu.
- **Footer:** A hairline, then a wrapping row of muted label links and the app count.

### Folder Tree (signature)
On an app page each platform's paths are merged into one tree. A folder that several paths share prints once in mono; the files and folders that differ hang under it behind the tree line. Each end point is a manila leaf with its label and its own copy button. A run of folders with nothing else in them prints on one line. Lines that are not filesystem paths (a command, a log channel) print whole as ordinary path rows.

**The Whole Path Rule.** The tree is presentation only. A path is never expanded, edited or shortened; environment variables stay as written, and every copy button copies the full stored path, however it is drawn.

### Copy confirmation
Copying prints a small manila chip with a check and the words, right beside the button that did it, for 1.8 seconds. It is a live region, so it is announced. If the clipboard is unavailable the path is printed in place to copy by hand. No toast.

### Motion
**The One Motion Rule.** One keyframe: a rise of 6px with a fade from 0.35 to full, 320ms on `cubic-bezier(0.16, 1, 0.3, 1)`. Result cards use it once on load, staggered 30ms per card up to the eighth; the copy confirmation reuses it. The only other movement is a disclosure arrow turning (160ms). Reduced-motion preference turns all of it off.

## Do's and Don'ts

### Do:
- **Do** write interface copy in plain words: search, add, delete, platform, log locations. Class names such as plate, zone, rack, scan and sheet are legacy names in the code only; they never appear in what a visitor reads and they say nothing about how a thing should look.
- **Do** give every colour as a token with a light and a dark value, and check a new screen in both themes.
- **Do** use the manila `tab` for fills you act on or that mark the current choice, with `tabfg` text on it.
- **Do** use `accent` for coloured text, links, focus rings and thin signals.
- **Do** set paths, file names, type tags and keys in Spline Sans Mono, and everything else in Bricolage Grotesque.
- **Do** print paths exactly as stored and let them wrap; give each one its own copy button.
- **Do** let text wrap with the window or its layout column.
- **Do** separate cards with space and split rows inside a container with a `line` hairline.
- **Do** keep the consent buttons identical.

### Don't:
- **Don't** use `tab` as a text colour on the ground, or put any text other than `tabfg` or `tabdim` on a tab fill.
- **Don't** add a theme switch or store a theme choice. The device decides.
- **Don't** write a raw colour value in a component.
- **Don't** cap a text block's width in `ch`.
- **Don't** use uppercase or letter-spaced labels, condensed type, or a third typeface.
- **Don't** add gradients, or a shadow on anything that does not float over the page.
- **Don't** colour text with a platform colour, or show a platform by colour alone.
- **Don't** announce a copy with a toast; say it beside the button.
- **Don't** reuse the folder tab as a small label above other content. It belongs to the search field.
- **Don't** add hover lifts, scale effects or scroll reveals. One motion is the whole grammar.
- **Don't** bring back warehouse words or looks: no stencil caps, hazard stripes, square steel plates or signal cyan.
