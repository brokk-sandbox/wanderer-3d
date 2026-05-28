# WANDERER 3D — GitHub Pages Action Version Upgrades

## Date
2026-05-28

## Issue
Deploy job still reported:
- `Node.js 20 is deprecated... actions/deploy-pages@v4 ...`
- Warning persisted even after adding `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`.

## Root cause
`actions/deploy-pages@v4` was still pinned while newer `@v5` exists and includes Node.js 24 runtime support.

## Fix
Updated `.github/workflows/deploy-pages.yml`:
- `actions/configure-pages` from `@v5` → `@v6`
- `actions/upload-pages-artifact` from `@v3` → `@v5`
- `actions/deploy-pages` from `@v4` → `@v5`

Removed explicit `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` overrides that were previously added to suppress runtime warnings.

## Expected result
- Action runtime deprecation warning for Node.js 20 should stop once executed with the updated action versions.
- Workflow behavior remains the same: build on `main` push / manual dispatch and deploy to
  `https://brokk-sandbox.github.io/wanderer-3d/`.