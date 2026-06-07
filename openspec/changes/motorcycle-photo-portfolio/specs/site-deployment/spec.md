## ADDED Requirements

### Requirement: Build and deploy on push

A GitHub Actions workflow SHALL run the build pipeline on every push to the default branch and deploy the generated static output to GitHub Pages.

#### Scenario: Push triggers deploy

- **WHEN** a commit is pushed to the default branch
- **THEN** the workflow runs the build and publishes the updated site to GitHub Pages

#### Scenario: Build failure blocks deploy

- **WHEN** the build pipeline exits with an error during the workflow
- **THEN** the workflow fails and does not deploy a partial or broken site

### Requirement: Deploy originals to the site

The deployed output SHALL include the full-resolution originals under `_site/originals/` with clean names so they are reachable for the opt-in download/view-full actions.

#### Scenario: Originals present in deployed output

- **WHEN** the workflow completes a deploy
- **THEN** each photo's original is reachable under `/originals/<clean-name>.<ext>` on the published site

### Requirement: Derivatives are ephemeral, originals are committed

Generated derivatives and the `_site/` build output SHALL be gitignored and produced fresh during the workflow, while source originals under `photos/` SHALL be committed to the repository.

#### Scenario: Derivatives excluded from version control

- **WHEN** the repository is inspected after a build
- **THEN** generated derivatives and `_site/` are not tracked by git, while `photos/` originals are tracked

#### Scenario: Clean checkout reproduces the site

- **WHEN** the workflow runs from a fresh checkout containing only committed sources
- **THEN** the build regenerates all derivatives and produces the complete deployable site
