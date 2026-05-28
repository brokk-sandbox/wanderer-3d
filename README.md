# WANDERER 3D

A procedural 3JS survival/game prototype refactored into a modular Vite project structure.

## Setup

```bash
cd /home/userone/source/github/public/wanderer-3d
npm install
npm run dev
```

## Project structure

- `index.html` — entrypoint shell
- `src/main.js` — bootstraps the game module
- `src/game/game.js` — main game script (migrated from the original `index.html` inline script)
- `src/game/data/config.js` — shared game constants
- `src/game/terrain.js` — terrain noise/elevation helpers
- `src/game/audio.js` — audio playback helper
- `src/style.css` — extracted styles
- `index.original.html` — backup copy of the original single-file page
- `package.json`, `dist/`, and lock files as usual

## Run

`npm run dev` starts a local dev server and serves the app from `/src/main.js`.

## Previous single-file backup

If you need to inspect the original flat version, open `index.original.html`.
