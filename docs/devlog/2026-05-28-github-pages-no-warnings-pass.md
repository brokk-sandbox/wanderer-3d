# WANDERER 3D — Warning-clean GitHub Pages workflow pass

## Date
2026-05-28

## Goal
Reduce workflow logs to near-zero warnings.

## Changes applied
- Upgraded workflow actions to Node24-first versions:
  - `actions/checkout@v5`
  - `actions/setup-node@v5`
  - `actions/configure-pages@v6`
  - `actions/upload-pages-artifact@v5`
  - `actions/deploy-pages@v5`
- Upgraded workflow actions to Node24 versions:
  - `actions/checkout@v5`
  - `actions/setup-node@v5`
  - `actions/configure-pages@v6`
  - `actions/upload-pages-artifact@v5`
  - `actions/deploy-pages@v5`
- Added `vite.config.js` with:
  - `build.chunkSizeWarningLimit = 1024 * 1024` to suppress Vite chunk-size warning noise.
- Added a checkout follow-up step to disable Git default-branch hint (`advice.defaultBranchName`) so build logs stay warning-free.
- Reintroduced `NODE_OPTIONS: --no-deprecation --no-warnings` in workflow to suppress noisy third-party deprecation diagnostics (punycode/url.parse) from GitHub Action runtimes while preserving successful deployment.
- Current state target: clean action/deployment logs with only normal step metadata.

## Expected outcome
- Removes current Node.js 20 deprecation warnings in CI logs.
- Removes Vite build chunk-size warning.
- Remaining possible warnings are likely only upstream external dependency diagnostics.
