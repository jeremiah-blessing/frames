## Why

I shoot motorcycle racing photography and need a public portfolio to showcase the work — but the source frames are large (2–12 MB Canon full-frame JPGs) and there is no site, build, or hosting in place today. A portfolio must load fast and read as technically credible to other photographers, while the heavy originals stay available for anyone who wants to inspect or download them. The camera already embeds rich EXIF (shutter, aperture, ISO, focal length, lens, capture date), so the proof of craft and the ordering/naming can be derived automatically rather than hand-maintained.

## What Changes

- Add a **custom Node + sharp build pipeline** (no framework) that reads originals from `photos/`, extracts EXIF, sorts by capture date, renames to a stable `moto-NNN` sequence, and emits WebP derivatives at three widths (400 / 1000 / 2000px) plus a JPG fallback.
- Generate a **`photos.json` manifest** (original→clean-name map, EXIF technical meta line, and an auto-generated placeholder caption that the owner replaces later) and a static **`index.html`**.
- Render a **single flat justified grid + lightbox** with a dark, dense, data-forward aesthetic; each photo shows a monospace EXIF meta line (e.g. `1/1600s · f/2.8 · 200mm · ISO 160`) and its caption.
- Keep **originals off the default fast path**: the grid and lightbox load only WebP derivatives. Originals are **opt-in only** via a per-photo "Download original (12 MB)" button and a "View full" toggle that swaps the lightbox image to the full-resolution original inline for pixel-peeping.
- **Deploy via GitHub Actions on push** to GitHub Pages. Originals live in git and are deployed to `_site/originals/` with clean URLs (referenced only on the opt-in action); generated derivatives are ephemeral and gitignored, not committed.

Non-goals (for now): albums/collections, a backend or database, search/filtering, manual per-photo curation order, AVIF output.

## Capabilities

### New Capabilities
- `photo-build-pipeline`: Read originals, extract EXIF, sort by capture date, rename to `moto-NNN`, generate WebP/JPG derivatives at three sizes, and emit the `photos.json` manifest with EXIF meta lines and placeholder captions.
- `gallery-viewer`: A static single-page justified grid + lightbox that renders derivatives with responsive `srcset`, EXIF meta line, and caption, in a dark/technical visual identity.
- `original-access`: Opt-in access to full-resolution originals — per-photo download button and an inline "View full" toggle in the lightbox — without loading originals on the default path.
- `site-deployment`: GitHub Actions workflow that runs the build on push and deploys the static output (including originals under `_site/originals/`) to GitHub Pages.

### Modified Capabilities
<!-- None — this is a greenfield project with no existing specs. -->

## Impact

- **New tooling/dependencies**: Node 22 (present), `sharp` (image processing), plus a lightweight EXIF read (raw parse or a small dependency).
- **Repo layout**: adds `photos/` (originals, committed), `src/` (build script + HTML template), generated `photos.json`, `.github/workflows/`, and a gitignored `_site/` build output.
- **Hosting**: GitHub Pages (free tier). Default-path bandwidth is small (WebP only); original downloads are billed only when explicitly requested.
- **Existing files**: the current root-level JPGs become the seed of `photos/` and will be referenced/renamed by the pipeline.
