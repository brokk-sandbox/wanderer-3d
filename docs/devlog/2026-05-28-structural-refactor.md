# WANDERER 3D — Devlog
## Date
2026-05-28

## Working Directory
`/home/userone/source/github/public/wanderer-3d`

## Objective
Refactor the downloaded single-file `index.html` 3JS game into a proper project structure while preserving behavior as much as possible.

---

## Completed Changes

### 1) Repo baseline established
- Pulled project from `https://github.com/brokk-sandbox/wanderer-3d.git` into working dir.
- Confirmed latest changes were present and no pending remote updates at the time.

### 2) Initial extraction into a module scaffold
- Split inline script and style into dedicated source files:
  - `index.html` now links to:
    - `/src/style.css`
    - `/src/main.js` (module entry)
  - `src/style.css` (extracted from inline `<style>`)
  - `src/main.js` (extracted from inline `<script type="module">`)
- Preserved gameplay markup (all UI elements / HUD / windows) in `index.html` shell.
- Kept original DOM structure and IDs/classes referenced by JS.

### 3) Vite project setup
- Added package scaffold:
  - `package.json` with:
    - scripts: `dev`, `build`, `preview`
    - dependencies: `three`
    - devDependencies: `vite`
- Installed dependencies (`npm install`).
- Build validation passed with `vite build`.
- Added/updated README with setup and run instructions.
- Preserved original monolithic source as `index.original.html` backup.

### 4) Structural module refactor (second phase)
Created modular game folders under `src/`:

- `src/game/game.js`
  - Contains the migrated core game loop and logic (migrated from previous inline script).
- `src/game/terrain.js`
  - Contains exported functions:
    - `hash`
    - `noise`
    - `fbm`
    - `getElevation`
- `src/game/audio.js`
  - Exported audio factory `createAudioPlayer()`.
  - Returns a reusable `playSfx` function.
- `src/game/data/config.js`
  - Item display names
  - Toolbar configuration
  - Spawn config factory
  - Recipes
  - Item/category constants:
    - `WEAPON_TYPES`
    - `PLACEABLE_ITEMS`
    - `UNSTACKABLE_ITEMS`

### 5) Bootstrapping entrypoint
- Replaced functional `src/main.js` with:
  ```js
  import './game/game.js';
  ```

### 6) Runtime wiring updates
- `src/game/game.js` now imports from shared modules:
  - `terrain`, `audio`, and `data/config`.
- `playSfx` now uses shared audio helper.
- Replaced local constant arrays in key gameplay sections with shared imports where matching.
- Duplicate declaration cleanup and marker cleanup performed where necessary after mechanical extraction.

### 7) Validation
- `npm run build` completed successfully multiple times after refactor.
- Generated `dist/` remains as build output.

---

## Current Working Status (What we are doing now)

### In-progress / next phase to continue
1. Perform a second-pass cleanup of remaining implicit globals/side effects.
2. Further split `src/game/game.js` into domain-specific systems:
   - `systems/ui.js`
   - `systems/input.js`
   - `systems/world.js`
   - `systems/inventory.js`
   - `systems/spawn.js`
   - `systems/combat.js`
3. Convert repeated magic literals to shared constants/config values.
4. Add lightweight typed/runtime guards where practical.
5. Add a docs index (`docs/README.md`) with conventions and architecture notes.

### Known follow-up debt
- `src/game/game.js` is still monolithic and large (~2k lines).
- `dist/` and `index.original.html` are included for history/backup but may be considered build artifacts or archive references.
- No functional gameplay QA run has been done post-refactor (build passes, behavior should be smoke-tested via browser).

---

## File Summary After Refactor

### Source
- `index.html` — entry shell and DOM structure
- `src/style.css` — stylesheet
- `src/main.js` — bootstrap importer
- `src/game/game.js` — core migrated gameplay
- `src/game/terrain.js` — terrain generation helpers
- `src/game/audio.js` — audio helper
- `src/game/data/config.js` — constants/config data

### Other
- `index.original.html` — preserved original single-file snapshot
- `package.json`, `package-lock.json` — npm setup
- `dist/*` — Vite build output
- `README.md` — updated run instructions

---

## Notes on approach
This refactor was performed incrementally to minimize risk:
1) extraction and bootstrap → validated
2) dependency setup → validated
3) module extraction → validated
4) follow-up cleanup/plans captured here

The goal remains keeping current gameplay behavior intact while making the project maintainable and aligned with a standard 3JS + Vite structure.
