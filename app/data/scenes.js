/**
 * Scene configuration data for Platinum Township
 * Coordinates normalized from SketchUp origin (divided by 1000 for Three.js scale)
 * 
 * CSV Name → Actual filename mapping handled here
 */

export const SCALE_FACTOR = 1000;

// Aerial scenes have massive Z (height) values
const rawScenes = [
  {
    id: 'scene-02', name: 'Gate', type: 'ground', yawOffset: 1.466, csvName: 'Scene 02', file: 'Scene 2_1', x: 491395, y: 98250, z: 2790,
    hotspots: [
      { targetId: 'scene-29', yaw: 1.515, pitch: -0.009 },
    ],
  },

  {
    id: 'scene-24', name: 'Scene 24', type: 'ground', yawOffset: -1.094, csvName: 'Scene 24', file: 'Scene 24', x: 548872, y: 232634, z: 2142,
    hotspots: [
      { targetId: 'scene-29', yaw: 2.2246, pitch: -0.0062 },
      { targetId: 'scene-17', yaw: -2.1838, pitch: 0.0266 },
      { targetId: 'scene-31', yaw: -1.6461, pitch: 0.0261 },
    ]
  },

  {
    id: 'scene-27', name: 'Scene 27', type: 'ground', yawOffset: 0, csvName: 'Scene 27', file: 'Scene 27_1', x: 531504, y: 237915, z: 2337,
    hotspots: [
      { targetId: 'scene-29', yaw: 2.3432, pitch: -0.0475 },
      { targetId: 'scene-17', yaw: -0.2112, pitch: -0.0502 },
      // { targetId: 'scene-24', yaw: 1.0295, pitch: 0.0128 },
    ]
  },

  {
    id: 'scene-29', name: 'Scene 29', type: 'ground', yawOffset: 1.720, csvName: 'Scene 29', file: 'Scene 29', x: 530032, y: 225249, z: 2914,
    hotspots: [
      { targetId: 'scene-02', yaw: -2.1283, pitch: -0.0127 },
      { targetId: 'scene-24', yaw: 2.140, pitch: -0.018 },
      { targetId: 'scene-27', yaw: 1.0818, pitch: -0.0638 },
      // { targetId: 'scene-17', yaw: 1.3255, pitch: -0.0004 },
    ],
  },

  {
    id: 'scene-30', name: 'Scene 30', type: 'ground', yawOffset: 0, csvName: 'Scene 30', file: 'Scene 30', x: 664598, y: 436101, z: 2052,
    hotspots: [

    ],
  },

  {
    id: 'scene-17', name: 'Scene 17', type: 'ground', yawOffset: 0, csvName: 'Scene 17', file: 'Scene 17', x: 540548, y: 256809, z: 2186,
    hotspots: [
      { targetId: 'scene-24', yaw: 0.8376, pitch: -0.0172 },
      { targetId: 'scene-27', yaw: 1.6984, pitch: -0.0035 },
      { targetId: 'scene-31', yaw: -1.2371, pitch: 0.0305 },
    ],
  },

  {
    id: 'scene-31', name: 'Scene 31', type: 'ground', yawOffset: 0, csvName: 'Scene 31', file: 'Scene 31', x: 579091, y: 333056, z: 3361,
    hotspots: [
      { targetId: 'scene-17', yaw: 1.6235, pitch: -0.0190 },
      { targetId: 'scene-24', yaw: 1.4090, pitch: -0.0068 },
      { targetId: 'scene-30', yaw: -1.3425, pitch: -0.0033 },
    ],
  },


  // Aerials (Disabled for now)
  // { id: 'scene-14', name: 'Sky View 1', type: 'aerial', yawOffset: 0, csvName: 'Scene 14', file: 'Scene 14', x: 447440, y: -74372, z: 162008 },
  // { id: 'scene-15', name: 'Sky View 2', type: 'aerial', yawOffset: 0, csvName: 'Scene 15', file: 'Scene 15', x: -433711, y: 467552, z: 893773 },
  // { id: 'scene-22', name: 'Sky View 3', type: 'aerial', yawOffset: 0, csvName: 'Scene 22', file: 'Scene 22', x: 913145, y: 301944, z: 404056 },
];

// Calculate center using ONLY ground scenes to prevent extreme skewing
const groundScenes = rawScenes.filter(s => s.type === 'ground');
const centerX = groundScenes.reduce((s, sc) => s + sc.x, 0) / groundScenes.length;
const centerY = groundScenes.reduce((s, sc) => s + sc.y, 0) / groundScenes.length;
const centerZ = groundScenes.reduce((s, sc) => s + sc.z, 0) / groundScenes.length;

// The raw-CSV centroid the app's 3D coordinate system is built around. Exported so
// other data (plots, the 2D site map) can be converted into the SAME space — see
// app/data/geo.js, the single place all coordinate conversions live.
export const RAW_CENTER = { x: centerX, y: centerY, z: centerZ };

// Process scenes with normalized coordinates
export const scenes = rawScenes.map((scene) => {
  const normalizedX = (scene.x - centerX) / SCALE_FACTOR;
  const normalizedY = (scene.z - centerZ) / SCALE_FACTOR; // Swap Y/Z for Three.js (Y-up)
  const normalizedZ = (scene.y - centerY) / SCALE_FACTOR;

  return {
    id: scene.id,
    name: scene.name,
    type: scene.type,
    yawOffset: scene.yawOffset,
    panoramaUrl: `/panoramas/${scene.file}.jpg`,
    thumbnailUrl: `/panoramas/thumbs/${scene.file}_thumb.jpg`,
    originalPanorama: `${scene.file}.png`,
    position: [normalizedX, normalizedY, normalizedZ],
    rawPosition: [scene.x, scene.y, scene.z],
    hotspots: scene.hotspots || [], // Manual hotspots if defined
  };
});


export const sceneAdjacency = {};
scenes.forEach((scene) => {
  sceneAdjacency[scene.id] = scene.hotspots.map(h => ({
    id: h.targetId,
    yaw: h.yaw,
    pitch: h.pitch
  }));
});

export const DEFAULT_SCENE = 'scene-02'; // Start at the gate/ground

export function getSceneById(id) {
  return scenes.find((s) => s.id === id);
}

// Returns array of { targetScene, yaw?, pitch? }
export function getAdjacentScenes(id) {
  const adjacentData = sceneAdjacency[id] || [];
  return adjacentData.map(data => {
    const targetScene = getSceneById(data.id);
    if (!targetScene) return null;
    return {
      targetScene,
      yaw: data.yaw,
      pitch: data.pitch
    };
  }).filter(Boolean);
}

/**
 * Camera euler.y to ARRIVE with in `toSceneId` so the viewer keeps facing the same
 * physical direction they had in `fromSceneId` — i.e. real continuity through a door.
 *
 * The accurate path uses the two scenes' reciprocal hotspots (the angles the user
 * authored and trusts), so it is INDEPENDENT of yawOffset calibration and of
 * world-position accuracy:
 *
 *   In `from`, facing `to`   → euler = yawAB
 *   In `to`,   facing `from` → euler = yawBA   (same physical axis, opposite way)
 *   arrival = departure - yawAB + yawBA - π
 *
 * Derivation: both panoramas are rigid rotations of the same world, so euler.y maps
 * to world bearing with slope 1. The yawAB/yawBA pair pins the relative rotation
 * between the two frames; the absolute world bearing cancels out. Concretely, if you
 * walk while looking straight at the hotspot (departure = yawAB) you arrive looking
 * straight ahead, away from where you came (yawBA + π) — exactly what "walking
 * forward through the door" should feel like.
 *
 * Falls back to the yawOffset world-bearing model only when there is no reciprocal
 * hotspot (e.g. a dead-end scene that defines no hotspots of its own).
 */
export function getArrivalYaw(fromSceneId, toSceneId, departureYaw) {
  const from = getSceneById(fromSceneId);
  const to = getSceneById(toSceneId);
  if (!from || !to) return departureYaw;

  const yawAB = from.hotspots.find(h => h.targetId === toSceneId)?.yaw;
  const yawBA = to.hotspots.find(h => h.targetId === fromSceneId)?.yaw;

  if (yawAB !== undefined && yawBA !== undefined) {
    return departureYaw - yawAB + yawBA - Math.PI;
  }

  // Fallback: align via per-scene world calibration offsets.
  const worldBearing = departureYaw + (from.yawOffset || 0);
  return worldBearing - (to.yawOffset || 0);
}
