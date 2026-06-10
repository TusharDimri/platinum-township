/**
 * Plot (property) tag data for Platinum Township.
 *
 * THE BIG IDEA — mark a plot once, see it from every scene:
 * A plot is a single point in WORLD space. Each panorama scene is just a camera
 * standing at a known world position, so once a plot's world position is known we
 * can compute the exact yaw/pitch it appears at from ANY scene — the same tag
 * automatically shows up at the right spot, from the right angle, everywhere.
 *
 * AUTHORING WORKFLOW (dev mode):
 *   1. In the walkthrough, press Shift+P (Plot Builder) and Shift+Click the plot
 *      on the ground. A `'scene-xx': { yaw, pitch }` line is copied to clipboard.
 *   2. Paste it into the plot's `marks` below.
 *   3. Walk to a DIFFERENT scene that can see the same plot, and mark it again.
 *   4. With 2+ marks the plot's world position is triangulated automatically and
 *      the tag appears in every other scene too. More marks = better accuracy.
 *
 * Per scene the tag uses, in order of preference:
 *   - the authored mark for that scene (always pixel-exact), else
 *   - the projection of the triangulated/explicit world position.
 *
 * Scenes are calibrated using the navigation hotspots you already authored in
 * scenes.js (each hotspot pins the panorama's rotation against real geometry),
 * so projection accuracy improves as scenes gain hotspots. A scene with no
 * hotspots falls back to its yawOffset.
 */

import { scenes, getSceneById } from './scenes.js';

/* =========================================================
   PLOT DATA — edit this
   ========================================================= */

const rawPlots = [
  {
    id: 'plot-demo-1',
    name: 'Plot 12',
    // Either author `marks` (preferred, via Shift+P) or an explicit world
    // `position` [x, y, z] in normalized scene coordinates.
    // This demo plot sits midway between Scene 27 and Scene 17 so you can see
    // the same tag resolve to different angles from different scenes.
    position: {},
    marks: {
    },
    info: {
      number: '1',
      area: '1,500 sq.ft',
      dimensions: "30' × 50'",
      facing: 'East',
      price: '₹ 24.75 Lakhs',
      status: 'Available',
      description:
        'Premium east-facing plot on the main avenue, close to the central park and clubhouse. Clear title with immediate registration.',
    },
    // Optional: hideIn: ['scene-02'], maxDistance: 120
  },
];

/* =========================================================
   Implementation
   ========================================================= */

// Plots stay pinned at their real spot from ANY distance — if a plot is in
// frame, its tag is on it. Set a per-plot `maxDistance` to hide a tag in far
// scenes; authored marks are always shown regardless.
const DEFAULT_MAX_DISTANCE = Infinity;

function midpointOf(sceneIdA, sceneIdB, yOffset = 0) {
  const a = getSceneById(sceneIdA);
  const b = getSceneById(sceneIdB);
  if (!a || !b) return null;
  return [
    (a.position[0] + b.position[0]) / 2,
    (a.position[1] + b.position[1]) / 2 + yOffset,
    (a.position[2] + b.position[2]) / 2,
  ];
}

// Camera-frame conventions (must match BuilderMode capture + hotspot placement):
//   direction(yaw, pitch) = (-sin(yaw)·cos(pitch), sin(pitch), -cos(yaw)·cos(pitch))
//   yaw(v) = atan2(-v.x, -v.z), pitch(v) = asin(v.y / |v|)
function worldYawOf(dx, dz) {
  return Math.atan2(-dx, -dz);
}

function wrapAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/**
 * Per-scene yaw calibration `c` such that  worldYaw = localYaw + c.
 * Estimated as the circular mean over the scene's authored hotspots of
 * (true world bearing to the target scene − authored hotspot yaw); this uses the
 * angles the author actually verified on screen, so it is far more reliable than
 * the hand-tuned yawOffset, which is only used as a fallback.
 */
const sceneCalibration = {};
for (const scene of scenes) {
  let sumSin = 0;
  let sumCos = 0;
  let count = 0;
  for (const h of scene.hotspots) {
    const target = getSceneById(h.targetId);
    if (!target || h.yaw === undefined) continue;
    const dx = target.position[0] - scene.position[0];
    const dz = target.position[2] - scene.position[2];
    const delta = worldYawOf(dx, dz) - h.yaw;
    sumSin += Math.sin(delta);
    sumCos += Math.cos(delta);
    count++;
  }
  sceneCalibration[scene.id] =
    count > 0 ? Math.atan2(sumSin, sumCos) : scene.yawOffset || 0;
}

/** World-space unit ray direction for a mark made in a given scene. */
function markToWorldRay(scene, mark) {
  const w = mark.yaw + sceneCalibration[scene.id];
  const cp = Math.cos(mark.pitch);
  return {
    origin: scene.position,
    dir: [-Math.sin(w) * cp, Math.sin(mark.pitch), -Math.cos(w) * cp],
  };
}

/**
 * Least-squares closest point to N rays (N ≥ 2):
 * solve  Σ (I − d·dᵀ) x  =  Σ (I − d·dᵀ) o   — a 3×3 linear system.
 */
function triangulateRays(rays) {
  const A = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const b = [0, 0, 0];

  for (const { origin, dir } of rays) {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const m = (i === j ? 1 : 0) - dir[i] * dir[j];
        A[i][j] += m;
        b[i] += m * origin[j];
      }
    }
  }

  // Gaussian elimination with partial pivoting
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let r = col + 1; r < 3; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-9) return null; // degenerate (parallel rays)
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c < 4; c++) M[r][c] -= f * M[col][c];
    }
  }
  return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
}

function resolveWorldPosition(rawPlot) {
  // Explicit position only counts if it's a real [x, y, z] — anything else
  // (e.g. a leftover `{}`) falls through to mark triangulation.
  if (
    Array.isArray(rawPlot.position) &&
    rawPlot.position.length === 3 &&
    rawPlot.position.every(Number.isFinite)
  ) {
    return rawPlot.position;
  }

  const rays = [];
  for (const [sceneId, mark] of Object.entries(rawPlot.marks || {})) {
    const scene = getSceneById(sceneId);
    if (scene) rays.push(markToWorldRay(scene, mark));
  }
  if (rays.length < 2) return null;
  return triangulateRays(rays);
}

export const plots = rawPlots.map((p) => ({
  ...p,
  marks: p.marks || {},
  worldPosition: resolveWorldPosition(p),
}));

/**
 * All plot tags visible from a scene, each resolved to that scene's camera frame.
 * Returns [{ plot, yaw, pitch, distance }] — `distance` is null for authored
 * marks (unknown without a world position).
 */
export function getPlotsForScene(sceneId) {
  const scene = getSceneById(sceneId);
  if (!scene) return [];

  const result = [];
  for (const plot of plots) {
    if (plot.hideIn?.includes(sceneId)) continue;

    const mark = plot.marks[sceneId];
    if (mark) {
      let distance = null;
      if (plot.worldPosition) {
        const dx = plot.worldPosition[0] - scene.position[0];
        const dy = plot.worldPosition[1] - scene.position[1];
        const dz = plot.worldPosition[2] - scene.position[2];
        distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
      result.push({ plot, yaw: mark.yaw, pitch: mark.pitch, distance });
      continue;
    }

    if (!plot.worldPosition) continue;

    const dx = plot.worldPosition[0] - scene.position[0];
    const dy = plot.worldPosition[1] - scene.position[1];
    const dz = plot.worldPosition[2] - scene.position[2];
    const horizontal = Math.sqrt(dx * dx + dz * dz);
    const distance = Math.sqrt(horizontal * horizontal + dy * dy);
    if (distance > (plot.maxDistance ?? DEFAULT_MAX_DISTANCE)) continue;

    result.push({
      plot,
      yaw: wrapAngle(worldYawOf(dx, dz) - sceneCalibration[sceneId]),
      pitch: Math.atan2(dy, horizontal),
      distance,
    });
  }
  return result;
}
