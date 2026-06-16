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
    id: 'scene-56', name: 'Scene 56', type: 'ground', yawOffset: 0, csvName: 'Scene 56', file: 'Scene 56', x: 505909, y: 94380, z: 2628,
    hotspots: [
      { targetId: 'scene-57', yaw: 1.5629, pitch: -0.0034 },
    ]
  },

  {
    id: 'scene-57', name: 'Scene 57', type: 'ground', yawOffset: 0, csvName: 'Scene 57', file: 'Scene 57', x: 514090, y: 134200, z: 3135,
    hotspots: [
      { targetId: 'scene-56', yaw: -1.4239, pitch: -0.0378 },
      { targetId: 'scene-58', yaw: 1.5924, pitch: -0.0054 },
    ]
  },

  {
    id: 'scene-58', name: 'Scene 58', type: 'ground', yawOffset: 0, csvName: 'Scene 58', file: 'Scene 58', x: 526036, y: 212558, z: 2590,
    hotspots: [
      { targetId: 'scene-57', yaw: -1.9874, pitch: -0.0101 },
      { targetId: 'scene-59', yaw: 1.5463, pitch: -0.0084 },
    ]
  },

  {
    id: 'scene-59', name: 'Scene 59', type: 'ground', yawOffset: 0, csvName: 'Scene 59', file: 'Scene 59', x: 538681, y: 233928, z: 2658,
    hotspots: [
      { targetId: 'scene-58', yaw: -0.2631, pitch: -0.0289 },
      { targetId: 'scene-60', yaw: -2.7045, pitch: -0.0533 },
    ]
  },
  {
    id: 'scene-60', name: 'Scene 60', type: 'ground', yawOffset: 0, csvName: 'Scene 60', file: 'Scene 60', x: 548382, y: 237417, z: 2610, hotspots: [
      { targetId: 'scene-59', yaw: 2.6771, pitch: 0.0076 },
      { targetId: 'scene-62', yaw: -1.5308, pitch: 0.0112 },
      { targetId: 'scene-80', yaw: -0.2022, pitch: -0.0051 },

    ]

  },

  // { id: 'scene-61', name: 'Scene 61', type: 'ground', yawOffset: 0, csvName: 'Scene 61', file: 'Scene 61', x: 552271, y: 247041, z: 2581, hotspots: [] },
  {
    id: 'scene-62', name: 'Scene 62', type: 'ground', yawOffset: 0, csvName: 'Scene 62', file: 'Scene 62', x: 561389, y: 277330, z: 3057,
    hotspots: [
      { targetId: 'scene-60', yaw: -1.6172, pitch: -0.0292 },
      { targetId: 'scene-79', yaw: -1.3791, pitch: -0.0268 },
      { targetId: 'scene-63', yaw: 1.6086, pitch: -0.0092 },
    ]
  },

  {
    id: 'scene-63', name: 'Scene 63', type: 'ground', yawOffset: 0, csvName: 'Scene 63', file: 'Scene 63', x: 581974, y: 339217, z: 2463,
    hotspots: [
      { targetId: 'scene-62', yaw: -1.4457, pitch: 0.0166 },
      { targetId: 'scene-64', yaw: 1.7309, pitch: 0.0007 },
    ]
  },
  {
    id: 'scene-64', name: 'Scene 64', type: 'ground', yawOffset: 0, csvName: 'Scene 64', file: 'Scene 64', x: 590644, y: 368257, z: 2433,
    hotspots: [
      { targetId: 'scene-63', yaw: -1.2936, pitch: -0.0100 },
      { targetId: 'scene-76', yaw: -2.9844, pitch: 0.0115 },
      { targetId: 'scene-65', yaw: 1.5526, pitch: 0.0023 },
    ]
  },

  {
    id: 'scene-65', name: 'Scene 65', type: 'ground', yawOffset: 0, csvName: 'Scene 65', file: 'Scene 65', x: 591462, y: 395606, z: 2437,
    hotspots: [
      { targetId: 'scene-64', yaw: -1.4346, pitch: 0.0093 },
      { targetId: 'scene-66', yaw: 1.6614, pitch: -0.0379 },
    ]
  },


  {
    id: 'scene-66', name: 'Scene 66', type: 'ground', yawOffset: 0, csvName: 'Scene 66', file: 'Scene 66', x: 592496, y: 426103, z: 2241,
    hotspots: [
      { targetId: 'scene-73', yaw: -2.9269, pitch: -0.0084 },
      { targetId: 'scene-65', yaw: -1.4994, pitch: 0.0298 },
      { targetId: 'scene-67', yaw: 1.5813, pitch: 0.0079 },
    ]
  },

  {
    id: 'scene-67', name: 'Scene 67', type: 'ground', yawOffset: 0, csvName: 'Scene 67', file: 'Scene 67', x: 593884, y: 463697, z: 2738,
    hotspots: [
      { targetId: 'scene-66', yaw: -1.5977, pitch: -0.0302 },
      { targetId: 'scene-68', yaw: 1.6790, pitch: 0.0191 },
    ]
  },
  {
    id: 'scene-68', name: 'Scene 68', type: 'ground', yawOffset: 0, csvName: 'Scene 68', file: 'Scene 68', x: 600072, y: 525352, z: 2375,
    hotspots: [
      { targetId: 'scene-67', yaw: 0.1757, pitch: -0.0013 },
      { targetId: 'scene-69', yaw: -1.5822, pitch: -0.0214 },
    ]
  },

  {
    id: 'scene-69', name: 'Scene 69', type: 'ground', yawOffset: 0, csvName: 'Scene 69', file: 'Scene 69', x: 617169, y: 528339, z: 2276, hotspots:
      [
        { targetId: 'scene-68', yaw: -1.7984, pitch: -0.0098 },
        { targetId: 'scene-70', yaw: 1.7059, pitch: 0.0023 },
      ]
  },

  {
    id: 'scene-70', name: 'Scene 70', type: 'ground', yawOffset: 0, csvName: 'Scene 70', file: 'Scene 70', x: 653645, y: 522043, z: 2229,
    hotspots: [
      { targetId: 'scene-69', yaw: -3.1027, pitch: 0.0058 },
      { targetId: 'scene-71', yaw: 1.5567, pitch: -0.0056 },
    ]
  },

  {
    id: 'scene-71', name: 'Scene 71', type: 'ground', yawOffset: 0, csvName: 'Scene 71', file: 'Scene 71', x: 652331, y: 501442, z: 2401, hotspots: [
      { targetId: 'scene-70', yaw: -1.4836, pitch: -0.0329 },
      { targetId: 'scene-72', yaw: 1.5531, pitch: 0.0268 },
    ]
  },

  {
    id: 'scene-72', name: 'Scene 72', type: 'ground', yawOffset: 0, csvName: 'Scene 72', file: 'Scene 72', x: 651242, y: 470611, z: 2651, hotspots: [
      { targetId: 'scene-71', yaw: -1.5847, pitch: -0.0105 },
      { targetId: 'scene-74', yaw: 1.4162, pitch: 0.0027 },
      { targetId: 'scene-73', yaw: 1.8954, pitch: -0.0051 },
    ]
  },

  {
    id: 'scene-73', name: 'Scene 73', type: 'ground', yawOffset: 0, csvName: 'Scene 73', file: 'Scene 73', x: 637124, y: 416293, z: 3339,
    hotspots: [
      { targetId: 'scene-74', yaw: -1.5362, pitch: -0.0375 },
      { targetId: 'scene-66', yaw: 1.4571, pitch: -0.0360 },
      { targetId: 'scene-72', yaw: -3.1398, pitch: -0.0236 },
    ]
  },

  {
    id: 'scene-74', name: 'Scene 74', type: 'ground', yawOffset: 0, csvName: 'Scene 74', file: 'Scene 74', x: 661483, y: 409536, z: 2772,
    hotspots: [
      { targetId: 'scene-72', yaw: -0.4455, pitch: 0.0081 },
      { targetId: 'scene-73', yaw: -1.4851, pitch: -0.0382 },
      { targetId: 'scene-78', yaw: 2.4409, pitch: 0.0105 },

    ]
  },

  // { id: 'scene-75', name: 'Scene 75', type: 'ground', yawOffset: 0, csvName: 'Scene 75', file: 'Scene 75', x: 596068, y: 371842, z: 2359, hotspots: [] },

  {
    id: 'scene-76', name: 'Scene 76', type: 'ground', yawOffset: 0, csvName: 'Scene 76', file: 'Scene 76', x: 633608, y: 361259, z: 2529,
    hotspots: [
      { targetId: 'scene-64', yaw: -1.6931, pitch: -0.0072 },
      { targetId: 'scene-77', yaw: 1.5904, pitch: -0.0094 },
    ]
  },

  {
    id: 'scene-77', name: 'Scene 77', type: 'ground', yawOffset: 0, csvName: 'Scene 77', file: 'Scene 77', x: 665182, y: 351874, z: 2673,
    hotspots: [
      { targetId: 'scene-78', yaw: 1.4190, pitch: -0.0193 },
      { targetId: 'scene-76', yaw: -1.6227, pitch: -0.0235 },
    ]
  },

  {
    id: 'scene-78', name: 'Scene 78', type: 'ground', yawOffset: 0, csvName: 'Scene 78', file: 'Scene 78', x: 701368, y: 351402, z: 2164,
    hotspots: [
      { targetId: 'scene-77', yaw: -0.3664, pitch: 0.0043 },
      { targetId: 'scene-74', yaw: 0.5846, pitch: 0.0120 },
    ]
  },


  // {
  //   id: 'scene-79', name: 'Scene 79', type: 'ground', yawOffset: 0, csvName: 'Scene 79', file: 'Scene 79', x: 550390, y: 245509, z: 2138, hotspots:
  //     [
  //       { targetId: 'scene-60', yaw: -3.0136, pitch: -0.0808 },
  //       { targetId: 'scene-62', yaw: 0.0776, pitch: -0.0138 },
  //       { targetId: 'scene-80', yaw: 1.6040, pitch: 0.0007 },
  //     ]
  // },

  {
    id: 'scene-80', name: 'Scene 80', type: 'ground', yawOffset: 0, csvName: 'Scene 80', file: 'Scene 80', x: 581964, y: 236556, z: 2290,
    hotspots: [
      { targetId: 'scene-81', yaw: 1.1035, pitch: -0.0068 },
      { targetId: 'scene-60', yaw: -1.8097, pitch: 0.0002 },
    ]
  },

  {
    id: 'scene-81', name: 'Scene 81', type: 'ground', yawOffset: 0, csvName: 'Scene 81', file: 'Scene 81', x: 605372, y: 241817, z: 2448,
    hotspots: [
      { targetId: 'scene-80', yaw: -0.6077, pitch: -0.0123 },
    ]
  },


  // { id: 'scene-82', name: 'Scene 82', type: 'ground', yawOffset: 0, csvName: 'Scene 82', file: 'Scene 82', x: 611854, y: 264327, z: 2283, hotspots: [] },

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
    // Optional per-pixel depth map for Tier-B parallax. Only consumed when
    // DEPTH_ENABLED is on in PanoramaViewer AND the file exists (generate with
    // scripts/depth_infer.py). Harmless to point at a missing file otherwise.
    depthUrl: `/panoramas/depth/${scene.file}.jpg`,
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

export const DEFAULT_SCENE = 'scene-56'; // Start at the first new scene

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
