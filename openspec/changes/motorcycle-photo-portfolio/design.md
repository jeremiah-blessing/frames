## Context

Greenfield project. The repo currently holds ~20 large Canon JPGs (2–12 MB, 24–26 MP, full-frame R6 Mark III / R8) at the root and a fresh OpenSpec scaffold — no build, site, or hosting. The files carry full EXIF (verified: e.g. `ExposureTime 1/1600`, `FNumber 2.8`, `ISO 160`, `FocalLength 200mm`, `LensModel RF70-200mm F2.8 L IS USM Z`, `DateTimeOriginal 2026:02:01`).

Constraints and intent established during exploration:
- **Static only** — GitHub Pages, no backend/database.
- **Originals in git** — the heavy source files are the committed source of truth.
- **Fast/technical tone (75/25)** — performance and credible metadata over decorative chrome.
- **Flat stream** — one curated grid, no albums.
- Node 22 and npm are available locally.

## Goals / Non-Goals

**Goals:**
- A single static page that loads fast (WebP derivatives only on the default path) and reads as technically credible (EXIF surfaced as a first-class element).
- A repeatable, idempotent build: drop a photo in `photos/`, commit, push → site rebuilds and deploys.
- Automatic ordering, renaming, and caption seeding derived from EXIF so there is near-zero manual maintenance.
- Originals reachable but never on the critical path — opt-in download and inline pixel-peep.

**Non-Goals:**
- Albums/collections, search/filtering, tags, or manual curation order.
- Any backend, auth, comments, or analytics.
- AVIF output, a CSS/JS framework, or a static-site generator.
- Editing/optimizing originals (they are stored as-shot).

## Decisions

### D1: Custom Node + `sharp` script over a framework (Astro/Eleventy)
A single flat page with a bespoke EXIF-driven manifest does not justify a framework's conventions or "magic." A ~150-line `build.mjs` gives total control over derivative sizes, manifest shape, and HTML output, and keeps the dependency surface to `sharp` (+ a small EXIF reader). *Alternatives:* Astro/`astro:assets` and Eleventy/`eleventy-img` both ship excellent responsive-image pipelines, but add framework learning and indirection for a one-page site.

### D2: EXIF as the visual identity
The technical meta line (`1/1600s · f/2.8 · 200mm · ISO 160`) is rendered in monospace as a primary design element, not a tooltip. It is honest evidence of craft (panning vs. freezing reads directly from shutter speed) and costs zero manual input. Order, `moto-NNN` naming, and placeholder captions all derive from EXIF/date.

### D3: Derivatives generated in CI, never committed
Originals already bloat git; committing derivatives would double it. The GitHub Actions workflow regenerates `_site/` from committed sources on every push. `_site/` and any derivative cache are gitignored. *Alternative:* commit derivatives for zero-CI local deploys — rejected as redundant storage and a manual rebuild burden.

### D4: Originals served from Pages at `/originals/<clean-name>.<ext>`
Originals are copied into `_site/originals/` during the build and referenced only by the opt-in actions. Clean same-domain URLs, works if the repo later goes private, and the "rare click" makes the Pages bandwidth cost negligible. *Alternative:* link to `raw.githubusercontent.com` to keep the Pages artifact tiny — rejected for ugly URLs, rate limits, and breakage if the repo goes private.

### D5: `photos.json` manifest as the single intermediate contract
The build emits an ordered manifest (`name`, `src`, `original`, `sizes`, `meta`, `caption`); the page renders purely from it. This decouples processing from presentation, makes the rename map and caption seeds inspectable, and gives the owner one obvious file to hand-edit captions in later. Captions are seeded automatically and overwritten by the human over time.

### D6: Opt-in originals via two distinct affordances
"Download original (12 MB)" (save to disk, size disclosed) and "View full" (swap derivative → original inline for pixel-peeping) are separate intents. Neither fetches an original until activated, preserving the fast default path.

### D7: Responsive delivery
Three WebP widths (400 / 1000 / 2000) cover grid thumb / lightbox / large, with a 1000px JPG fallback for non-WebP clients. `<picture>`/`srcset`+`sizes` selects per viewport; grid images lazy-load. No upscaling beyond source width.

## Risks / Trade-offs

- **Repo growth from originals in git** → Accepted by decision; mitigate by keeping only portfolio-worthy frames in `photos/` and relying on Pages, not git, for delivery. Revisit Git LFS only if the repo becomes unwieldy.
- **Pages bandwidth on original downloads (12 MB each)** → Originals are opt-in and rarely clicked; default path is WebP-only. Honest size labels deter casual mass-downloading.
- **EXIF gaps / non-camera files** → Build degrades gracefully: missing exposure fields are omitted from the meta line; missing `DateTimeOriginal` falls back to file mtime for ordering. Build must not abort on a single odd file.
- **`sharp` install in CI** (native binaries) → Pin Node 22 and `sharp` versions; rely on prebuilt binaries; cache npm in the workflow.
- **Build-time scaling** → Regenerating all derivatives every push is fine at ~dozens of photos; if the set grows large, add a content-hash cache to skip unchanged sources (supports the idempotent-rebuild requirement).
- **Renames shift `moto-NNN` when inserting older photos** → Sequence is derived from capture-date order, so inserting an earlier-dated photo renumbers later ones. Acceptable for a personal portfolio; if stable URLs become important, switch to date-based names (`YYYY-MM-DD-NNN`).

## Migration Plan

Greenfield, so "migration" is initial setup:
1. Add `sharp` (+ EXIF reader) to a new `package.json`; commit `photos/` (seeded from the existing root JPGs).
2. Implement `src/build.mjs` and `src/template.html`; add `.gitignore` for `_site/` and any derivative cache.
3. Verify locally (`node src/build.mjs`) — inspect `photos.json`, open `_site/index.html`.
4. Add `.github/workflows/deploy.yml`; enable GitHub Pages (Actions source).
5. Push → confirm deploy, fast grid, working lightbox, and that originals load only on opt-in.

Rollback: revert the workflow/commit; since derivatives are ephemeral and originals are untouched in git, there is no data to recover.

## Open Questions

- Final `moto-NNN` vs. date-based naming if stable per-photo URLs later matter (default: `moto-NNN`).
- Caption-seed format — pure EXIF/date string vs. a friendlier template — to be tuned once real captions are written.
- Whether to add a tiny content-hash cache now or defer until the photo count makes full rebuilds slow (default: defer).
