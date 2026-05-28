# WANDERER 3D — GitHub Pages Deployment Setup

## Date
2026-05-28

## Goal
Make the game playable from a public URL directly from the GitHub repository (no local install required).

## What was added
- Added GitHub Actions workflow: `.github/workflows/deploy-pages.yml`
- Workflow triggers on:
  - push to `main`
  - manual dispatch (`workflow_dispatch`)
- Workflow steps:
  1. install dependencies
  2. build with repository-aware base path
  3. upload `dist/` artifact
  4. deploy to GitHub Pages
- Added deployment notes and public URL to `README.md`.

## Base-path handling
For repository Pages deployment, Vite is built with:

```bash
npm run build -- --base /<repository-name>/
```

Implemented directly in workflow as:

```yaml
run: npm run build -- --base /${{ github.event.repository.name }}/
```

which resolves to `/wanderer-3d/` for this repo.

## Notes for manual follow-up
- GitHub repository settings must have **Pages source = GitHub Actions**.
- First deployment may take a minute to become available at:
  - `https://brokk-sandbox.github.io/wanderer-3d/`