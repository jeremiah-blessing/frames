# EXIF Technique Strip — Design

**Date:** 2026-06-07
**Status:** Approved (pending spec review)
**Project:** `frames` — static photo portfolio (https://jeremiah-blessing.github.io/frames/)

## Context

The portfolio currently shows EXIF as a single pre-joined mono text line
(`1/1600s · f/2.8 · 200mm · ISO 160`) in the lightbox only. Grid thumbnails show
no metadata. The owner wants the EXIF/caption to carry **more visual emphasis**,
while keeping the existing minimal justified-mosaic layout.

Exploration (with live mockups) converged on visualizing the **shutter speed as a
photographic technique** — slow shutter = panning, fast = frozen — because for
motorcycle race photography the shutter speed is the evidence of craft. A
full-width gauge/slider was prototyped and rejected as too heavy; the resolved
direction is a **compact one-line strip** overlaid on the image.

## Goals / Non-Goals

**Goals:**
- Surface EXIF with more emphasis via a compact strip overlaid on the image.
- Classify and label each shot's technique (PANNING / TRACKING / FROZEN) from
  shutter speed, shown in a small white box with a zone-colored left edge.
- Show one icon per data point: shutter, aperture, focal length, ISO.
- Keep the grid clean at rest; reveal metadata on hover; show full detail in the
  lightbox.
- Degrade gracefully when EXIF fields are missing.

**Non-Goals:**
- No change to layout (justified mosaic stays), build pipeline architecture,
  originals/opt-in behavior, or deployment.
- No full-width gauge/slider (explicitly rejected).
- No new dependencies.
- No albums, filtering, or sorting by technique (future possibility, out of scope).

## The Strip

A single bottom-aligned line over the image, on a subtle dark gradient scrim for
legibility:

```
 ┌──────────┐
 │▎PANNING │   ⏱ 1/100    ◎ f/11    ⬡ 200mm    ▤ 160
 └──────────┘
  white box,      four icon-stats (white mono values)
  colored left edge
```

### Technique classification (from shutter speed)

Let `d` = shutter denominator (e.g. `1/100s` → `d = 100`).

| Zone       | Rule              | Left-edge color |
|------------|-------------------|-----------------|
| `PANNING`  | `d ≤ 250`         | blue            |
| `TRACKING` | `250 < d < 1000`  | neutral grey    |
| `FROZEN`   | `d ≥ 1000`        | red             |

Shutter speeds slower than 1s (rare here) classify as `PANNING`. The exact color
hex values are an implementation detail; defaults: PANNING `#5aa8ff`,
TRACKING `#9a9aa2`, FROZEN `#ff6347`.

### White box (technique tag)

- White background, dark text, small monospace caps.
- A colored left edge (≈3px border) tinted by the zone.
- Contains only the zone word.

### Icon-stats

Four inline SVG icons, each followed by its white monospace value:

| Data point   | Icon        | Example value |
|--------------|-------------|---------------|
| Shutter      | stopwatch   | `1/100`       |
| Aperture     | iris circle | `f/11`        |
| Focal length | lens ellipse| `200mm`       |
| ISO          | film strip  | `160`         |

Icons are stroke-based SVG using `currentColor` (white on the scrim).

## Placement

- **Lightbox:** the full strip (white box + all four icon-stats). The **caption**
  renders on its own line below the strip.
- **Grid (at rest):** pure photos, no overlay.
- **Grid (hover):** a compact strip fades in — **white box + shutter value only** —
  keeping thumbnails light while signalling technique.
- **Touch devices:** no hover; tapping a thumbnail opens the lightbox, where the
  full strip appears.

## Graceful Fallback

- **No shutter EXIF:** omit the white box and zone word entirely; render whichever
  of the remaining icon-stats have values.
- **No exposure data at all:** show only the caption.
- The strip never breaks the image layout; missing fields are simply absent.

## Data Model Change

`photos.json` currently stores EXIF pre-joined as a single `meta` string. To render
each value with its own icon and to classify the technique, the build will also
emit the discrete fields per photo:

```jsonc
{
  "shutter":  "1/100",   // display string
  "shutterDenominator": 100,  // numeric, for zone classification
  "aperture": "f/11",
  "focal":    "200mm",
  "iso":      "160",
  "technique": "PANNING"  // derived; null if no shutter
}
```

The existing `meta` string may be retained for backward compatibility or removed;
the strip renders from the discrete fields. Caption handling (auto-seed + merge
preservation) is unchanged.

## Component Boundaries

- **`src/build.mjs`** — extends EXIF extraction to emit discrete fields, adds a
  `classifyTechnique(shutterDenominator)` pure function, and renders the strip
  markup (lightbox full + grid compact) from the manifest.
- **`src/template.html`** — adds the strip CSS (scrim, white box, icon sizing),
  the grid hover-reveal styling, and the icon SVG symbol set. The lightbox JS that
  swaps images on navigation must also populate the strip per photo.
- **`classifyTechnique`** is independently testable: input a shutter denominator
  (or null), output `"PANNING" | "TRACKING" | "FROZEN" | null`.

## Risks / Trade-offs

- **Strip legibility over bright image areas** → the gradient scrim mitigates;
  white box has its own solid background.
- **Hover doesn't exist on touch** → handled by routing mobile users to the
  lightbox; no metadata is lost.
- **Zone thresholds are opinionated** → only ~1 of the current 20 shots lands in
  TRACKING, but the owner chose 3 zones to future-proof as the collection grows.
- **Icon clarity at small sizes** → icons were reviewed in mockups; legend
  available if any needs changing later.

## Open Questions

None blocking. Color hex values and exact icon glyphs may be fine-tuned during
implementation without changing the design.
