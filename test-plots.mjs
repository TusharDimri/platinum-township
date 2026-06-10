// Ad-hoc check of the plot projection/triangulation math (not a test suite).
// Run: node test-plots.mjs
import { getSceneById } from './app/data/scenes.js';
import { plots, getPlotsForScene } from './app/data/plots.js';

const demo = plots[0];
console.log('demo plot world position:', demo.worldPosition);

for (const id of ['scene-27', 'scene-17', 'scene-24', 'scene-29', 'scene-31', 'scene-02']) {
  const entries = getPlotsForScene(id);
  const e = entries.find((x) => x.plot.id === demo.id);
  console.log(
    id.padEnd(9),
    e
      ? `yaw=${e.yaw.toFixed(3)} pitch=${e.pitch.toFixed(3)} dist=${e.distance?.toFixed(1)}`
      : '(not visible)'
  );
}

// Distances reported by projection should agree with the actual geometry.
const a = getPlotsForScene('scene-27').find((x) => x.plot.id === demo.id);
const b = getPlotsForScene('scene-17').find((x) => x.plot.id === demo.id);
function dist(p, q) {
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}
const s27 = getSceneById('scene-27');
const s17 = getSceneById('scene-17');
console.log('dist check scene-27:', a.distance.toFixed(2), 'vs', dist(s27.position, demo.worldPosition).toFixed(2));
console.log('dist check scene-17:', b.distance.toFixed(2), 'vs', dist(s17.position, demo.worldPosition).toFixed(2));
