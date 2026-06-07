## ADDED Requirements

### Requirement: Download original on demand

The lightbox SHALL provide a per-photo control to download the full-resolution original file, labeled with its approximate file size, and the original SHALL be fetched only when the control is activated.

#### Scenario: Download original

- **WHEN** a visitor activates the "Download original" control for a photo
- **THEN** the browser downloads that photo's full-resolution original file

#### Scenario: Size disclosed before download

- **WHEN** the "Download original" control is shown
- **THEN** its label discloses the approximate original file size (e.g. `Download original (12 MB)`)

### Requirement: View full-resolution original inline

The lightbox SHALL provide a "View full" toggle that swaps the displayed derivative for the full-resolution original in place, enabling pixel-level inspection. The original SHALL be requested only when the toggle is activated.

#### Scenario: Toggle to full resolution

- **WHEN** a visitor activates the "View full" toggle on a lightbox photo
- **THEN** the lightbox replaces the derivative with the full-resolution original image inline

#### Scenario: Toggle back to derivative

- **WHEN** a visitor deactivates the "View full" toggle
- **THEN** the lightbox returns to displaying the lightweight derivative

#### Scenario: Original not fetched until requested

- **WHEN** a visitor opens the lightbox but does not activate "View full" or "Download original"
- **THEN** no original file is fetched for that photo

### Requirement: Clean original URLs

Originals SHALL be served from a stable, clean path under the deployed site (e.g. `/originals/moto-001.jpg`) that matches the photo's clean name.

#### Scenario: Original resolves at clean path

- **WHEN** the "Download original" or "View full" action requests an original
- **THEN** it resolves at a clean `/originals/<clean-name>.<ext>` URL on the deployed site
