# Devlog

All ongoing implementation notes for this project live in this folder.

- `2026-05-28-structural-refactor.md` — Exhaustive notes for the current structural refactor and project organization changes.
- `2026-05-28-menu-button-fix.md` — Menu click handler hardening when start menu actions were not firing.
- `2026-05-28-state-initialization-fix.md` — Restores missing global state declarations (`leftWeapon`, `heldItem`, inventory/world arrays, movement flags) that caused runtime ReferenceErrors.
- `2026-05-28-github-pages-deploy.md` — Deploy flow and GitHub Pages setup so players can run directly from repository URL.
- `2026-05-28-github-actions-node24-env.md` — Added Node.js 24 runtime opt-in to suppress GitHub Actions deprecation warning.

Add a new dated markdown file for each subsequent engineering pass.
