## ADDED Requirements

### Requirement: Render a single justified photo grid

The gallery SHALL render all manifest photos in a single flat justified grid on one page, in manifest order, with no album or category grouping.

#### Scenario: All photos shown in order

- **WHEN** a visitor loads the gallery page
- **THEN** every photo in `photos.json` appears in the grid in manifest order

### Requirement: Serve only derivatives on the default path

The grid and lightbox SHALL load only WebP/JPG derivatives by default and SHALL NOT request original files during normal browsing.

#### Scenario: Grid loads lightweight images

- **WHEN** a visitor loads and scrolls the grid without taking any opt-in action
- **THEN** only derivative images are requested and no original file is fetched

#### Scenario: Responsive source selection

- **WHEN** the browser renders a grid thumbnail or lightbox image
- **THEN** the correct derivative width is selected via `srcset`/`sizes` for the viewport, preferring WebP with JPG fallback

### Requirement: Lazy-load grid images

The grid SHALL lazy-load images so that off-screen photos are not fetched until they approach the viewport.

#### Scenario: Off-screen images deferred

- **WHEN** the gallery page first loads with many photos
- **THEN** images far below the fold are not fetched until the visitor scrolls near them

### Requirement: Open photos in a lightbox

Clicking a grid photo SHALL open a lightbox showing the larger derivative, with controls to navigate to the previous/next photo and to close.

#### Scenario: Open and navigate

- **WHEN** a visitor clicks a grid photo and then activates "next"
- **THEN** the lightbox displays the clicked photo's larger derivative, then advances to the following photo

#### Scenario: Close the lightbox

- **WHEN** a visitor activates the close control or presses Escape
- **THEN** the lightbox closes and returns focus to the grid

### Requirement: Display EXIF meta and caption

Each lightbox view SHALL display the photo's EXIF technical meta line in a monospace style and its caption.

#### Scenario: Meta line and caption visible

- **WHEN** the lightbox displays a photo that has an EXIF meta line and a caption
- **THEN** both the monospace meta line (e.g. `1/1600s · f/2.8 · 200mm · ISO 160`) and the caption are shown

### Requirement: Dark, technical visual identity

The gallery SHALL present a dark, dense, data-forward visual identity with monospace treatment for EXIF metadata.

#### Scenario: Dark technical styling applied

- **WHEN** the gallery page renders
- **THEN** it uses a dark background and renders EXIF metadata in a monospace typeface
