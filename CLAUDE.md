# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> **Next.js 16 + React 19, App Router with Turbopack.** This is newer than most training data. Conventions and APIs may differ — consult `node_modules/next/dist/docs/` before writing framework code, per AGENTS.md.

## Commands

```bash
npm run dev      # Dev server (Turbopack) at http://localhost:3000
npm run build    # Production build
npm run start    # Serve production build
node scripts/optimize-assets.mjs   # Regenerate panoramas + thumbs + GLB from source assets
node test.js     # Ad-hoc scene-adjacency check (logs getAdjacentScenes output) — NOT a test suite
```

There is **no test framework, linter, or typechecker** configured. `test.js` is a one-off debug script, not CI.

## Asset pipeline

Source assets live **one level up** from the app, in the repo root (`d:\Platinum 3d\`), not in the project:
- `../PANORAMA/*.png` — raw equirectangular panoramas
- `../For Tushar.glb` — the 432 MB township model

`scripts/optimize-assets.mjs` (uses `sharp`) converts PNGs → progressive JPEG (`public/panoramas/`, capped at 8192px wide), generates 400px thumbnails (`public/panoramas/thumbs/`), and copies the GLB to `public/model/township.glb`. Run this after changing source art. The optimized outputs in `public/` are what the app actually loads; raw sources are never served.

## Architecture

A virtual-tour SPA: a landing page links to a 360° panorama walkthrough.

- **`app/page.js`** — marketing landing page (framer-motion). Cycles scene thumbnails as background; "Explore" routes to `/walkthrough`.
- **`app/walkthrough/page.js`** — the tour. Lazy-loads `PanoramaViewer` with `dynamic(..., { ssr: false })` because Three.js is client-only. Orchestrates loading screen, minimap, tour controls.

### `app/data/scenes.js` is the single source of truth

Everything (navigation, minimap, landing background, adjacency) derives from `rawScenes` here. Key transforms:
- Coordinates come from SketchUp exports (the CSV). They are recentered on the **ground-scenes centroid** and divided by `SCALE_FACTOR` (1000) for Three.js. **Y and Z are swapped** (`y → normalizedZ`, `z → normalizedY`) because Three.js is Y-up.
- `csvName` (e.g. `Scene 02`) maps to the real `file` on disk (e.g. `Scene 2_1`) — these differ; always go through the `file` field for URLs.
- **Adjacency / arrows:** if a scene defines a `hotspots` array, those manual links are used *exclusively* (with explicit `yaw`/`pitch`). Otherwise the code falls back to auto-guessing the 3 nearest ground scenes by 3D distance. Prefer adding explicit `hotspots` — that's the intended authoring path (see `walkthrough.md`).
- `DEFAULT_SCENE` is the entry scene.
- **Aerial scenes and the dollhouse are intentionally disabled** (commented out). `DollhouseViewer.js` exists but is not mounted. Some code paths (`goToSkyMap` → `scene-15`, `isDive` markers) reference the disabled aerials.

### Panorama rendering (`app/components/PanoramaViewer.js`)

react-three-fiber `Canvas` with the camera at the sphere center. The panorama is a `sphereGeometry` with the texture on `BackSide` and a negative X scale (`[-1,1,1]`) to un-mirror the equirectangular image.

- **Scene transitions are a Matterport-style walk:** during the `TRANSITION_MS` (1100ms) window (timed in `useSceneNavigation`), the destination sphere (`IncomingSphere`, radius 490) fades in over the current one while the camera dollies forward. The incoming sphere is pre-rotated by (departureYaw − arrivalYaw) and offset forward by the full dolly travel so the hard cut at the end (scene swap + camera snap) lands on a pixel-identical frame. A module-level LRU texture cache (`loadPanoramaTexture`/`peekPanoramaTexture`) lets the post-cut `PanoramaSphere` pick up the already-uploaded texture synchronously — never bypass it with a raw `TextureLoader`. Hotspots and plot tags are hidden mid-transition.
- **`yawOffset`** per scene aligns "north" so panoramas face a consistent direction. `targetYaw` carries the look-direction across a navigation so you keep facing your travel direction into the next scene.
- **Hotspot geometry** has two render paths: manual hotspots (explicit yaw/pitch → billboard placed via spherical coords) vs. automatic (flat ground chevron computed from world positions).

### Plot tags (`app/data/plots.js`, `PlotMarkers.js`, `PlotInfoPanel.js`)

Plots are world-space points shown as clickable tags (drei `Html`) in every scene that can see them; clicking opens an info panel. `plots.js` owns the math: per-scene yaw calibration is derived from authored hotspots (circular mean of world-bearing − authored-yaw; falls back to `yawOffset`), plot world positions are triangulated from 2+ per-scene `marks` (least-squares ray intersection), and `getPlotsForScene` projects each plot into a scene's camera frame. An authored mark always wins over projection in its own scene. Author marks with Shift+P in BuilderMode (see `walkthrough.md` §5).

### Navigation state (`app/hooks/useSceneNavigation.js`)

Owns navigation state: `currentSceneId`, transition flags, and loading progress. `navigateToScene` drives the timed dual-sphere swap. The walkthrough page binds Escape → return home (landing page).

### Dev authoring tools (in-browser, dev mode only)

These components are conditionally rendered only when `NODE_ENV !== 'production'` and are tree-shaken out of production builds. See `walkthrough.md` for the full authoring workflow:
- **`BuilderMode.js`** — `Shift+A` hotspot builder / `Shift+B` angle builder / `Shift+P` plot builder; `Shift+Click` captures yaw/pitch and copies a paste-ready `scenes.js` (or `plots.js`) line to the clipboard. Builds its overlay UI via imperative DOM (outside the R3F reconciler). `Esc` exits the mode.
- **`AdminRotationHelper.js`** — `Shift+R` toggles live `yawOffset` tuning with arrow keys, logging values to console.

### Styling

CSS Modules throughout (`app/styles/*.module.css`, colocated `*.module.css`). Path alias `@/*` → project root (`jsconfig.json`).
