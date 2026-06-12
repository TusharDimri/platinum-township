/**
 * Geo — the single source of truth for every spatial conversion in the app.
 *
 * Three coordinate spaces exist:
 *
 *  1. MODEL space (mm)  — SketchUp's current model coordinates. The 2D site map
 *     corners and the plot centers were exported in this space (Ruby console).
 *  2. CAMERA-CSV space (mm) — the coordinates in the original camera CSV that
 *     scenes.js is built from. SHOULD equal model space, but if the model origin
 *     moved after the CSV was exported, the two differ by a fixed offset.
 *  3. APP space — the Three.js world: camera-CSV space recentered on the
 *     ground-scene centroid, divided by 1000, with Y/Z swapped (Y-up).
 *
 * ─── CALIBRATION KNOB ──────────────────────────────────────────────────────
 * CAMERA_TO_MODEL_OFFSET_MM converts camera-CSV coords → model coords:
 *     model = csv + offset
 * Leave at zero if the CSV matches the model. If scene dots don't sit on the
 * site map where the cameras really stood, the origins differ — fix it without
 * re-exporting anything by capturing the cameras in CURRENT model coords:
 * in SketchUp's Ruby console run
 *     Sketchup.active_model.pages.each { |p|
 *       e = p.camera.eye
 *       puts "#{p.name}: #{e.x.to_mm.round}, #{e.y.to_mm.round}, #{e.z.to_mm.round}" }
 * then either update scenes.js with those numbers (preferred, offset stays 0)
 * or set this offset to (modelCoord − csvCoord) of any one scene.
 * ───────────────────────────────────────────────────────────────────────────
 */

import { RAW_CENTER, SCALE_FACTOR } from './scenes';

export const CAMERA_TO_MODEL_OFFSET_MM = { x: 0, y: 0, z: 0 };

/**
 * ── CSV ↔ MODEL AXIS SWAP (verified) ───────────────────────────────────────
 * The camera CSV's X and Y columns are SWAPPED relative to the current model:
 *     model = (csvY, csvX, csvZ) + offset
 * Verified two independent ways:
 *  1. With the swap, all 7 cameras land exactly on roads: the Gate at the site
 *     entrance, Scene 24 on the roundabout, 27/29/17 on the junction beside it,
 *     31 on the main avenue, 30 at the amenity zone. Without it, all 7 land
 *     outside the mapped site entirely.
 *  2. A hand-placed Shift+P mark in scene-17 (yaw −2.8098) matches the computed
 *     bearing of the nearest plot (Plot 13, 6.7 m away) within 2.7° under the
 *     swap — and disagrees wildly without it.
 * Note the app's 3D world is built from CSV-frame numbers, so positions ENTER
 * the 3D world via modelToCsv (swap back) — that keeps them consistent with the
 * authored hotspot yaws, which were calibrated against the CSV frame.
 * ───────────────────────────────────────────────────────────────────────────
 */
export function csvToModel(raw) {
  return [
    raw[1] + CAMERA_TO_MODEL_OFFSET_MM.x,
    raw[0] + CAMERA_TO_MODEL_OFFSET_MM.y,
    raw[2] + CAMERA_TO_MODEL_OFFSET_MM.z,
  ];
}

export function modelToCsv(model) {
  return [
    model[1] - CAMERA_TO_MODEL_OFFSET_MM.y,
    model[0] - CAMERA_TO_MODEL_OFFSET_MM.x,
    model[2] - CAMERA_TO_MODEL_OFFSET_MM.z,
  ];
}

/**
 * The 2D site map image and the model-space rectangle it covers.
 * Corners come from the Ruby viewport export (Top view + Parallel Projection):
 *   VIEWPORT: 1521 x 883
 *   TopLeft:     -17564, 763116      TopRight:    631339, 763116
 *   BottomLeft:  -17564, 386402      BottomRight: 631339, 386402
 * The exported PNG is 1521×883 px — identical to the viewport — so the image
 * maps edge-to-edge onto this rectangle. North (model +Y) is up.
 */
export const SITE_MAP = {
  url: '/2D Map.png',
  imageWidth: 1521,
  imageHeight: 883,
  world: {
    minX: -17564,
    maxX: 631339,
    minY: 386402,
    maxY: 763116,
  },
};

export const MAP_WORLD_WIDTH_MM = SITE_MAP.world.maxX - SITE_MAP.world.minX;
export const MAP_WORLD_HEIGHT_MM = SITE_MAP.world.maxY - SITE_MAP.world.minY;

/**
 * Model-space (mm) → position on the map image as fractions of its size.
 * u: 0 = left edge, 1 = right edge. v: 0 = top edge, 1 = bottom edge.
 * Values outside 0..1 are valid and mean "off the mapped area" — callers may
 * still render them (they land outside the image) or clamp as they see fit.
 */
export function modelToMapFraction(xMM, yMM) {
  return {
    u: (xMM - SITE_MAP.world.minX) / MAP_WORLD_WIDTH_MM,
    v: (SITE_MAP.world.maxY - yMM) / MAP_WORLD_HEIGHT_MM,
  };
}

/** Camera-CSV raw position ([x, y, z] mm) → map fraction, via the axis swap. */
export function cameraRawToMapFraction(raw) {
  const m = csvToModel(raw);
  return modelToMapFraction(m[0], m[1]);
}

/**
 * Model-space (mm) → APP space ([x, y, z], Three.js Y-up): swap back into the
 * CSV frame the 3D world is built in, then apply the exact transform scenes.js
 * applies to cameras (recenter, ÷1000, Y-up swap).
 */
export function modelToAppPosition(xMM, yMM, zMM) {
  const [cx, cy, cz] = modelToCsv([xMM, yMM, zMM]);
  return [
    (cx - RAW_CENTER.x) / SCALE_FACTOR,
    (cz - RAW_CENTER.z) / SCALE_FACTOR, // height → app Y
    (cy - RAW_CENTER.y) / SCALE_FACTOR, // CSV "north" → app Z
  ];
}
