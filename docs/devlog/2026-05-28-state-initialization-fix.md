# WANDERER 3D — Runtime State Regression Fix

## Date
2026-05-28

## Symptom observed in browser
- `Uncaught ReferenceError: leftWeapon is not defined` (init phase)
- `Uncaught ReferenceError: heldItem is not defined` (inventory/mouse handlers)
- Menu became visually present but interaction logic crashed during startup.

## Root cause
During a prior modularization edit, several global state declarations were accidentally removed from `src/game/game.js`, including:
- inventory/world containers: `inventorySlots`, `placedBoxes`, `objects`, `boars`
- interaction state: `openBoxId`, `openStationType`, `heldItem`, `ghostMesh`
- weapon refs: `leftWeapon`, `rightWeapon`
- movement/attack state buckets: `leftAttacking`, `rightAttacking`, `lTimer`, `rTimer`, `isAttacking`, `attackTimer`, movement flags/velocity/jump/timing, and `equipmentSlots`

These variables are referenced throughout gameplay systems (UI, rendering loop, combat, inventory, spawn/load/save, placing, etc.), so missing declarations caused immediate runtime exceptions.

## Fix applied
- Restored the missing global state block at top of `src/game/game.js` directly below `spawnConfig` setup.
- Reintroduced all state with initial values matching the single-file original behavior.

## Validation
- Rebuilt with Vite (`npm run build`) to ensure module compiles and all references resolve.
- Restarted dev server and confirmed expected host binding on VM (`0.0.0.0:5173`).
- Buttons/interactions can now reach previously crashing logic paths.

## Note
No gameplay behavior changes were introduced; this was a pure regression fix from refactor state-loss.