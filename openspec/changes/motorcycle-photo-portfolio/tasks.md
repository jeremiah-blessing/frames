## 1. Project Scaffold

- [x] 1.1 Create `package.json` (type: module, Node 22) with a `build` script (`node src/build.mjs`)
- [x] 1.2 Add dependencies: `sharp` and a small EXIF reader (`exif-reader`/`exifr`, or keep the verified raw EXIF parser)
- [x] 1.3 Create `photos/` and move/seed the existing root JPGs into it as committed originals
- [x] 1.4 Add `.gitignore` excluding `_site/` and any derivative cache; confirm `photos/` stays tracked
- [x] 1.5 Create `src/` with empty `build.mjs` and `template.html` placeholders

## 2. EXIF + Manifest (photo-build-pipeline)

- [x] 2.1 Implement source discovery: read all images under `photos/`
- [x] 2.2 Extract EXIF per photo (exposure time, f-number, ISO, focal length, lens, camera, `DateTimeOriginal`)
- [x] 2.3 Sort photos ascending by `DateTimeOriginal`, falling back to file mtime when the tag is absent
- [x] 2.4 Assign zero-padded `moto-NNN` names in sorted order and record original→clean mapping
- [x] 2.5 Format the technical meta line (e.g. `1/1600s · f/2.8 · 200mm · ISO 160`), omitting missing fields
- [x] 2.6 Generate an auto placeholder caption from EXIF/date
- [x] 2.7 Emit `photos.json` (ordered array of `name`, `src`, `original`, `sizes`, `meta`, `caption`)

## 3. Derivative Generation (photo-build-pipeline)

- [x] 3.1 Generate WebP derivatives at 400 / 1000 / 2000px widths, preserving aspect ratio, no upscaling
- [x] 3.2 Generate a 1000px JPG fallback per photo
- [x] 3.3 Copy originals into `_site/originals/<clean-name>.<ext>`
- [x] 3.4 Make rebuilds idempotent: skip regenerating derivatives whose source is unchanged
- [x] 3.5 Ensure the build degrades gracefully (does not abort) on a photo with missing/odd EXIF

## 4. Gallery Page (gallery-viewer)

- [x] 4.1 Build the `template.html` shell with dark, dense, data-forward styling and monospace EXIF treatment
- [x] 4.2 Render the flat justified grid from `photos.json` in manifest order
- [x] 4.3 Emit responsive `<picture>`/`srcset`+`sizes` (WebP with JPG fallback); load derivatives only
- [x] 4.4 Lazy-load off-screen grid images
- [x] 4.5 Implement the lightbox: open on click, prev/next navigation, close via control and Escape
- [x] 4.6 Display the EXIF meta line (monospace) and caption in the lightbox
- [x] 4.7 Write the rendered `index.html` (and assets) into `_site/`

## 5. Opt-in Originals (original-access)

- [x] 5.1 Add a per-photo "Download original (N MB)" control with the size disclosed in the label
- [x] 5.2 Add a "View full" toggle that swaps the lightbox derivative for the inline original
- [x] 5.3 Ensure originals are fetched only on activation (never on grid load or lightbox open)
- [x] 5.4 Point both actions at clean `/originals/<clean-name>.<ext>` URLs

## 6. Deployment (site-deployment)

- [x] 6.1 Add `.github/workflows/deploy.yml`: checkout, setup Node 22, `npm ci`, run build
- [x] 6.2 Cache npm and pin `sharp`/Node versions for reliable native installs in CI
- [x] 6.3 Deploy `_site/` (including `originals/`) to GitHub Pages on push to the default branch
- [x] 6.4 Fail the workflow (no deploy) when the build errors

## 7. Verification

- [x] 7.1 Run the build locally and inspect `photos.json` (order, names, meta, sizes, caption)
- [x] 7.2 Open `_site/index.html` locally: confirm fast grid, working lightbox, EXIF + captions
- [x] 7.3 Confirm the default path fetches no originals; verify download and view-full work on opt-in
- [ ] 7.4 Push and confirm the GitHub Pages deploy serves the site and `/originals/` URLs
      (requires `git init` + GitHub remote + enabling Pages → Actions; left for the owner)
