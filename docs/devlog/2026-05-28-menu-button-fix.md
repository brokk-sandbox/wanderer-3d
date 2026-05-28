# WANDERER 3D — Devlog

## Date
2026-05-28

## Issue
After confirming remote dev serving works, user reported start menu buttons were not responding in browser.

## Root cause hypothesis
Likely menu click handlers were not reliably attached during runtime (menu showed as expected, but button callbacks not triggering).

## Fix applied
### 1) Hardening menu click wiring
In `src/game/game.js`:
- Added `bindMenuButtons()` to ensure menu button handlers are attached even if previous registration path is missed.
- Added delegated click listener on `#main-menu` that resolves button IDs and calls correct handlers.
- Added defensive `btn.dataset.wired` checks to avoid duplicate handlers.
- Added global diagnostic object:
  - `window.__wandererMenu = { startGame, saveGame, loadGame, toggleMenu, giveItem }`

This provides:
- more stable UI wiring
- easier browser-side debugging if future button issues occur

### 2) Server restart for updated bundle
- Restarted Vite dev server after code updates.

### 3) Validation
- `npm run build` succeeds.
- Dev server started on `0.0.0.0:5173` (network URL `http://192.168.1.38:5173/`).

## Notes
No changes were made to gameplay logic beyond menu interaction hardening.
