# 🗺️ WANDERER 3D

A lightweight procedural **survival prototype** in Three.js, now structured as a clean Vite project and playable directly from the repo.

> **Live Game:** https://brokk-sandbox.github.io/wanderer-3d/

---

## 🎮 Game & Gameplay

### What you are playing
- Explore a generated open world with terrain, trees, rocks, shrubs, and boar enemies.
- Gather resources, craft tools, build shelters, and manage survival essentials.
- Use an equipment-based inventory with hand slots and quick-action toolbar.

### Core Loop (in practice)
1. **Spawn** with a basic starter weapon (`PointyStick`) and mobility gear (`Pants`).
2. **Gather** resources by approaching objects and holding **`E`** to collect.
3. **Craft** via stations and progress to advanced tools/structures.
4. **Fight** boars with melee tools (left/right hand combat).
5. **Save / load** via menu controls to preserve progress.

### Controls
- **WASD** — Move
- **Space** — Jump
- **E (hold)** — Interact/pickup progress (release early for quick pick)
- **Mouse LMB / RMB** — Left/right hand attack (when equipped)
- **1 / 2 / 3** — Use action toolbar slots
- **B** — Backpack, **P** — Pockets, **I** — Character, **C** — Crafting, **M** — Menu
- **Esc** — Cancel placement mode
- **Mouse** drag in windows — Move draggable UI panels

### Gameplay systems (overview)
- **World:** seeded/procedural terrain, natural spawn cycles, and periodic world respawn limits.
- **Inventory:** pocket slots + backpack + equipment/body slots + storage boxes.
- **Building:** place crafted structures (`Campfire`, `Workbench`, `Wood*` pieces, `StorageBox`, etc.).
- **Crafting stations:**
  - **Hand** — basic early-game items
  - **Campfire** — simple cooking
  - **Workbench** — advanced tools/furniture/build components
- **Combat UI:** target bar for boars and health bars for player/target.
- **Persistence:** client-side JSON save/load (`localStorage`) for inventory, world pickups, and placed containers/objects.

### Current player notes
- Torch lighting is used as a lighting dependency in-game logic (no default player headlight).
- Door and placement interactions are supported through interaction raycasts.
- Audio cues are lightweight, browser-native (WebAudio-based helpers).

---

## 🛠️ Game Development

### Project structure
- `index.html` — Vite entry shell + HUD/container markup
- `src/main.js` — app bootstrap
- `src/style.css` — extracted style sheet
- `src/game/game.js` — unified gameplay module
- `src/game/data/config.js` — item names, recipes, toolbar, spawn config
- `src/game/terrain.js` — elevation/noise helpers
- `src/game/audio.js` — simple SFX helper
- `index.original.html` — original single-file backup
- `.github/workflows/deploy-pages.yml` — CI pipeline for deployment
- `vite.config.js` — build config (chunk warning threshold tuned)

### Local setup
```bash
cd /home/userone/source/github/public/wanderer-3d
npm install
npm run dev          # local host
npm run dev:vm       # network-accessible host (VM users)
npm run build        # production build
npm run preview      # preview dist
```

### Play from GitHub Pages
- Repo is wired with GitHub Actions → Pages auto-deploy on `main` pushes.
- Workflow uses Node 24-friendly action versions and suppression for noisy runtime warnings from external action internals.
- Published URL: **https://brokk-sandbox.github.io/wanderer-3d/**

### CI / Deployment quick notes
- Action chain: `checkout` → `setup-node` → build → configure-pages → upload artifact → deploy.
- Chunk warning noise is reduced via `vite.config.js` (`chunkSizeWarningLimit`).
- Save this URL in bookmarks and share it as the public play link.

### Next dev milestones (suggested)
- Split `src/game/game.js` into dedicated modules (`ui`, `inventory`, `combat`, `world`).
- Improve responsiveness and accessibility on smaller screens.
- Add gameplay telemetry and deterministic world save schemas.

---

## 🌐 Reference docs
- Development notes: `docs/devlog/README.md`
- Deployment notes: `docs/devlog/2026-05-28-github-pages-deploy.md`
