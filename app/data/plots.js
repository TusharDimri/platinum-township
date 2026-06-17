/**
 * Plot (property) tag data for Platinum Township.
 *
 * Every plot is a single point in MODEL space (SketchUp mm, exported via the
 * Ruby console). From that one point the app derives:
 *   • its pin on the 2D site map (exact — same coordinate system as the map), and
 *   • its 3D tag in every panorama scene (projected via each scene's calibration).
 *
 * ── HOW TO EDIT (you will do this by hand) ─────────────────────────────────
 * Each entry in PLOT_SOURCE is one plot:
 *     P(0, 488709, 612902, 830)
 *      │  └──────┬───────┘  └ ground height (mm)
 *      │     SketchUp X, Y (mm)
 *      └ plot number → id 'plot-0', name 'Plot 0'
 *
 * The export wasn't in naming order, so identify each pin on the site map
 * (click it — the overlay shows its current name), then fix it here:
 *   • rename:        P(0, ...x, y, z..., { name: 'Plot 101' })
 *   • real details:  P(0, ...x, y, z..., { name: 'Plot 101', info: { area: '1,200 sq.ft',
 *                      dimensions: "30' × 40'", facing: 'North', price: '₹ 19.5 Lakhs',
 *                      status: 'Sold', description: '...' } })
 * Any info field you set overrides the demo defaults; the rest stay.
 * `status` drives pin/tag colors: Available (green) / Reserved (amber) / Sold (red).
 * Other per-plot options: hideIn: ['scene-02'], maxDistance: 120 (meters),
 * marks: { 'scene-17': { yaw, pitch } } — a Shift+P mark always overrides the
 * projected angle in its own scene (use it if a tag looks slightly off there).
 * ───────────────────────────────────────────────────────────────────────────
 */

import { scenes, getSceneById } from './scenes.js';
import { modelToAppPosition, modelToMapFraction } from './geo.js';

/* =========================================================
   PLOT DATA — edit this
   ========================================================= */

// Demo details shown for every plot until real data is filled in per plot.
const DEMO_INFO = {
  area: '1,500 sq.ft',
  dimensions: "30' × 50'",
  facing: 'East',
  price: '₹ 24.75 Lakhs',
  status: 'Available',
  description: 'Demo details — open this plot in plots.js and replace with real data.',
};

function P(n, x, y, z, overrides = {}) {
  return {
    id: `plot-${n}`,
    name: `Plot ${n}`,
    sketchup: [x, y, z],
    ...overrides,
    info: { number: String(n), ...DEMO_INFO, ...(overrides.info || {}) },
  };
}

const PLOT_SOURCE = [
  P(1, 260911, 535293, 830),
  P(2, 271008, 537666, 830),
  P(3, 280593, 540717, 830),
  P(4, 290167, 544098, 830),
  P(5, 299707, 547514, 830),
  P(6, 309188, 551053, 830),
  P(7, 318806, 554774, 830),
  P(8, 328600, 558016, 830),
  P(9, 338265, 560703, 830),
  P(10, 348015, 563814, 830),
  P(11, 357710, 566631, 830),
  P(12, 366136, 570234, 830),
  P(14, 377998, 572174, 830),
  P(15, 388259, 573793, 830),
  P(16, 398271, 574242, 830),
  P(17, 408450, 570364, 830),
  P(18, 418417, 570586, 830),
  P(19, 428340, 571687, 830),
  P(20, 438218, 573791, 830),
  P(21, 448086, 576955, 830),
  P(22, 459024, 580216, 830),
  P(23, 470939, 580852, 830),
  P(24, 482816, 581202, 830),
  P(25, 494002, 579595, 830),
  P(26, 504130, 580026, 830),
  P(27, 515336, 580508, 830),
  P(28, 506226, 559402, 830),
  P(29, 540966, 564747, 830),
  P(30, 535537, 581378, 830),
  P(31, 545808, 581838, 830),
  P(32, 542409, 610218, 830),
  P(33, 542332, 621724, 830),
  P(34, 542255, 631733, 830),
  P(35, 542061, 642947, 830),
  P(36, 518689, 614193, 830),
  P(37, 508696, 613763, 830),
  P(38, 498702, 613332, 830),
  P(39, 488709, 612902, 830),
  P(40, 478715, 612472, 830),
  P(41, 468721, 612042, 830),
  P(42, 458728, 611612, 830),
  P(43, 448734, 611181, 830),
  P(44, 435066, 610717, 830),
  P(45, 517700, 637178, 830),
  P(46, 507706, 636748, 830),
  P(47, 497713, 636317, 830),
  P(48, 487719, 635887, 830),
  P(49, 477726, 635457, 830),
  P(50, 467732, 635027, 830),
  P(51, 457738, 634597, 830),
  P(52, 447745, 634166, 830),
  P(53, 438396, 633764, 830),
  P(54, 426789, 633388, 830),
  P(55, 380937, 700286, 830),
  P(56, 384260, 689274, 830),
  P(57, 387149, 679697, 830),
  P(58, 390039, 670121, 830),
  P(59, 392928, 660544, 830),
  P(60, 395817, 650968, 830),
  P(61, 398706, 641392, 830),
  P(62, 401596, 631815, 830),
  P(63, 404485, 622239, 830),
  P(64, 407572, 612009, 830),
  P(65, 385968, 605491, 830),
  P(66, 382882, 615721, 830),
  P(67, 379993, 625297, 830),
  P(68, 377103, 634874, 830),
  P(69, 374214, 644450, 830),
  P(70, 371325, 654026, 830),
  P(71, 368435, 663603, 830),
  P(72, 365546, 673179, 830),
  P(73, 362657, 682756, 830),
  P(74, 359334, 693769, 830),
  P(75, 332183, 693471, 830),
  P(76, 333649, 682539, 830),
  P(77, 333188, 672282, 830),
  P(78, 335825, 662794, 830),
  P(79, 339059, 653555, 830),
  P(80, 343066, 644316, 830),
  P(81, 352155, 624236, 830),
  P(82, 349360, 595029, 830),
  P(83, 338979, 594804, 830),
  P(84, 329379, 593370, 830),
  P(85, 319803, 590481, 830),
  P(86, 310227, 587591, 830),
  P(87, 300650, 584702, 830),
  P(88, 291074, 581813, 830),
  P(89, 281497, 578923, 830),
  P(90, 271921, 576034, 830),
  P(91, 262345, 573145, 830),
  P(92, 251332, 569822, 830),
  P(93, 323456, 613002, 830),
  P(94, 313880, 610112, 830),
  P(95, 304303, 607223, 830),
  P(96, 294727, 604334, 830),
  P(97, 285151, 601444, 830),
  P(98, 275574, 598555, 830),
  P(99, 265998, 595666, 830),
  P(100, 256421, 592776, 830),
  P(101, 245409, 589454, 830),
  P(102, 235032, 616925, 830),
  P(103, 212585, 615377, 830),
  P(104, 214569, 606580, 830),
  P(105, 216723, 596782, 830),
  P(106, 218877, 586985, 830),
  P(107, 221038, 577205, 830),
  P(108, 223254, 567426, 830),
  P(109, 225470, 557646, 830),
];

/* =========================================================
   Implementation
   ========================================================= */

// In-panorama tags show for plots within this many meters of the camera. With
// 110 plots, showing all of them from every scene collapses into an unreadable
// band of overlapping pins at the horizon — nearby plots are what a visitor
// standing on that road cares about; the full site map shows everything at
// once. Per-plot `maxDistance` overrides this (set Infinity to always show);
// authored marks are always shown regardless.
const DEFAULT_MAX_DISTANCE = 33;

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
const scenePitchCalibration = {};

for (const scene of scenes) {
  let sumSin = 0;
  let sumCos = 0;
  let pitchOffsetSum = 0;
  let count = 0;

  for (const h of scene.hotspots) {
    const target = getSceneById(h.targetId);
    if (!target || h.yaw === undefined) continue;
    const dx = target.position[0] - scene.position[0];
    const dy = target.position[1] - scene.position[1];
    const dz = target.position[2] - scene.position[2];

    // Yaw difference
    const deltaYaw = worldYawOf(dx, dz) - h.yaw;
    sumSin += Math.sin(deltaYaw);
    sumCos += Math.cos(deltaYaw);

    // Pitch difference (true pitch - visual pitch)
    if (h.pitch !== undefined) {
      const horizontal = Math.sqrt(dx * dx + dz * dz);
      const truePitch = Math.atan2(dy, horizontal);
      pitchOffsetSum += (truePitch - h.pitch);
    }

    count++;
  }

  sceneCalibration[scene.id] =
    count > 0 ? Math.atan2(sumSin, sumCos) : scene.yawOffset || 0;
  scenePitchCalibration[scene.id] = count > 0 ? (pitchOffsetSum / count) : 0;
}

/** World-space unit ray direction for a mark made in a given scene. */
function markToWorldRay(scene, mark) {
  const w = mark.yaw + sceneCalibration[scene.id];
  const truePitch = mark.pitch + (scenePitchCalibration[scene.id] || 0);
  const cp = Math.cos(truePitch);
  return {
    origin: scene.position,
    dir: [-Math.sin(w) * cp, Math.sin(truePitch), -Math.cos(w) * cp],
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

/**
 * A plot's position in APP space, by precedence:
 *  1. explicit `position: [x, y, z]` (already app-space) — escape hatch,
 *  2. `sketchup: [x, y, z]` model-mm coords (the normal, exact path),
 *  3. triangulation from 2+ Shift+P `marks`.
 */
function resolveWorldPosition(rawPlot) {
  if (
    Array.isArray(rawPlot.position) &&
    rawPlot.position.length === 3 &&
    rawPlot.position.every(Number.isFinite)
  ) {
    return rawPlot.position;
  }

  if (
    Array.isArray(rawPlot.sketchup) &&
    rawPlot.sketchup.length === 3 &&
    rawPlot.sketchup.every(Number.isFinite)
  ) {
    return modelToAppPosition(...rawPlot.sketchup);
  }

  const rays = [];
  for (const [sceneId, mark] of Object.entries(rawPlot.marks || {})) {
    const scene = getSceneById(sceneId);
    if (scene) rays.push(markToWorldRay(scene, mark));
  }
  if (rays.length < 2) return null;
  return triangulateRays(rays);
}

export const plots = PLOT_SOURCE.map((p) => ({
  ...p,
  marks: p.marks || {},
  worldPosition: resolveWorldPosition(p),
  // Pin position on the 2D site map (fractions of the image; null if no
  // model-space coordinate is known — map pins require `sketchup`).
  map: Array.isArray(p.sketchup) ? modelToMapFraction(p.sketchup[0], p.sketchup[1]) : null,
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
      pitch: Math.atan2(dy, horizontal) - (scenePitchCalibration[sceneId] || 0),
      distance,
    });
  }
  return result;
}
