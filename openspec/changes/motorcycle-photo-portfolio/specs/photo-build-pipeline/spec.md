## ADDED Requirements

### Requirement: Discover and order source photos

The build SHALL discover all source images in the `photos/` directory and order them deterministically by capture date (EXIF `DateTimeOriginal`), earliest first by default.

#### Scenario: Photos ordered by capture date

- **WHEN** the build runs over a `photos/` directory containing multiple JPGs with valid EXIF
- **THEN** the resulting manifest lists photos in ascending `DateTimeOriginal` order

#### Scenario: Photo missing capture date

- **WHEN** a source photo has no `DateTimeOriginal` EXIF tag
- **THEN** the build SHALL fall back to the file's modification time for ordering and SHALL NOT abort the build

### Requirement: Extract EXIF metadata

The build SHALL extract EXIF exposure metadata from each source photo — exposure time, f-number, ISO, focal length, lens model, camera model, and capture date — and record it in the manifest.

#### Scenario: EXIF extracted into manifest

- **WHEN** the build processes a photo whose EXIF contains exposure time, f-number, ISO, and focal length
- **THEN** the manifest entry for that photo contains a formatted technical meta line (e.g. `1/1600s · f/2.8 · 200mm · ISO 160`)

#### Scenario: Partial EXIF present

- **WHEN** a photo is missing one or more exposure fields
- **THEN** the meta line SHALL include only the fields that are present, omitting the missing ones without error

### Requirement: Assign stable sequential names

The build SHALL assign each photo a clean sequential name of the form `moto-NNN` (zero-padded) based on capture-date order, and SHALL record the mapping from original filename to clean name in the manifest.

#### Scenario: Sequential renaming

- **WHEN** the build processes three photos in capture order
- **THEN** they are named `moto-001`, `moto-002`, `moto-003` and each manifest entry records its original source filename

### Requirement: Generate responsive derivatives

The build SHALL generate WebP derivatives at three widths — 400px, 1000px, and 2000px — plus a JPG fallback at the 1000px width, for each source photo. Derivatives SHALL preserve aspect ratio and SHALL NOT upscale beyond the source resolution.

#### Scenario: Three WebP sizes plus fallback produced

- **WHEN** the build processes a source photo wider than 2000px
- **THEN** it produces 400px, 1000px, and 2000px WebP files and a 1000px JPG fallback for that photo

#### Scenario: Source narrower than a target width

- **WHEN** a source photo is narrower than a requested derivative width
- **THEN** the build SHALL cap that derivative at the source width rather than upscaling

### Requirement: Emit the photos manifest

The build SHALL emit a `photos.json` manifest containing, per photo, the clean name, original source filename, derivative URLs with their pixel widths, the original URL, the EXIF meta line, and an auto-generated placeholder caption.

#### Scenario: Manifest entry shape

- **WHEN** the build completes successfully
- **THEN** `photos.json` is an ordered array where each entry includes `name`, `src`, `original`, `sizes` (width→url), `meta`, and `caption`

#### Scenario: Auto-generated placeholder caption

- **WHEN** the build generates a manifest entry and no human caption exists yet
- **THEN** the `caption` field is populated with a placeholder derived from EXIF/date that a human can later overwrite

### Requirement: Idempotent rebuilds

Re-running the build with unchanged inputs SHALL produce identical derivatives and manifest, and SHALL avoid regenerating derivatives that already exist and are up to date.

#### Scenario: No-op rebuild

- **WHEN** the build is run twice with no changes to `photos/`
- **THEN** the second run produces a manifest identical to the first and does not alter existing derivative files
