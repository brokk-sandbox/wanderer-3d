# WANDERER 3D — Warning-clean GitHub Pages workflow pass

## Date
2026-05-28

## Goal
Reduce workflow logs to near-zero warnings.

## Changes applied
- Upgraded all GitHub Pages workflow actions to Node24-capable versions:
  - `actions/checkout@v5`
  - `actions/setup-node@v5`
  - `actions/configure-pages@v6`
  - `actions/upload-pages-artifact@v5`
  - `actions/deploy-pages@v5`
- Added `vite.config.js` with:
  - `build.chunkSizeWarningLimit = 1024 * 1024` to silence Vite chunk-size noise.
- Added a pre-checkout step to disable Git default-branch advice (`advice.defaultBranchName`) so CI logs remain clean.
- Reintroduced workflow-level `NODE_OPTIONS=--no-deprecation --no-warnings` to suppress noisy runtime deprecations from action dependencies (e.g., punycode/url.parse).
- Resulting behavior: deployment remains successful while warning noise is reduced to normal operational metadata.

## Validation
- **Build**: `gh workflow run "Deploy to GitHub Pages"`
- **Latest successful run:** `26593304360` (on commit `4e30ad5`)
- After final adjustments (`4e30ad5`), logs no longer showed deprecation warnings from GitHub Pages actions or Vite build warnings.

## Notes
- `NODE_OPTIONS` was briefly removed for validation and showed internal runtime warnings again; it was restored for a practical, stable clean-log state.
- This is a CI quality pass only (game behavior unchanged).
