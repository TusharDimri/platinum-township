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
  // description: 'Plot Details',
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
  P(1, 260911, 535293, 830, { info: { 'area': '238.31 Sq. Yd.', 'front': '11.00 M', 'rear': '11.05 M', 'depthR': '18.64 M', 'depthL': '17.62 M', 'gardenArea': '162.64 Sq. Yd.' } }),
  P(2, 271008, 537666, 830, { info: { 'area': '234.17 Sq. Yd.', 'front': '10.15 M', 'rear': '10.22 M', 'depthR': '19.88 M', 'depthL': '18.64 M', 'gardenArea': '140.6 Sq. Yd.' } }),
  P(3, 280593, 540717, 830, { info: { 'area': '246.36 Sq. Yd.', 'front': '10.15 M', 'rear': '10.18 M', 'depthR': '20.65 M', 'depthL': '19.88 M', 'gardenArea': '120.9 Sq. Yd.' } }),
  P(4, 290167, 544098, 830, { info: { 'area': '254.87 Sq. Yd.', 'front': '10.15 M', 'rear': '10.17 M', 'depthR': '21.34 M', 'depthL': '20.65 M', 'gardenArea': '100.41 Sq. Yd.' } }),
  P(5, 299707, 547514, 830, { info: { 'area': '262.51 Sq. Yd.', 'front': '10.15 M', 'rear': '10.16 M', 'depthR': '21.75 M', 'depthL': '21.34 M', 'gardenArea': '79.96 Sq. Yd.' } }),
  P(6, 309188, 551053, 830, { info: { 'area': '264.48 Sq. Yd.', 'front': '10.15 M', 'rear': '10.15 M', 'depthR': '21.82 M', 'depthL': '21.75 M', 'gardenArea': '59.45 Sq. Yd.' } }),
  P(7, 318806, 554774, 830, { info: { 'area': '265.22 Sq. Yd.', 'front': '10.15 M', 'rear': '10.15 M', 'depthR': '21.79 M', 'depthL': '21.82 M', 'gardenArea': '42.36 Sq. Yd.' } }),
  P(8, 328600, 558016, 830, { info: { 'area': '262.13 Sq. Yd.', 'front': '10.15 M', 'rear': '10.16 M', 'depthR': '21.39 M', 'depthL': '21.79 M', 'gardenArea': '45.9 Sq. Yd.' } }),
  P(9, 338265, 560703, 830, { info: { 'area': '257.28 Sq. Yd.', 'front': '10.15 M', 'rear': '10.16 M', 'depthR': '21.00 M', 'depthL': '21.39 M', 'gardenArea': '52.35 Sq. Yd.' } }),
  P(10, 348015, 563814, 830, { info: { 'area': '252.44 Sq. Yd.', 'front': '10.15 M', 'rear': '10.16 M', 'depthR': '20.60 M', 'depthL': '21.00 M', 'gardenArea': '54.86 Sq. Yd.' } }),
  P(11, 357710, 566631, 830, { info: { 'area': '251.53 Sq. Yd.', 'front': '10.16 M', 'rear': '10.22 M', 'depthR': '21.33 M', 'depthL': '20.60 M', 'gardenArea': '60.38 Sq. Yd.' } }),
  P(12, 366136, 570234, 830, { info: { 'area': '292.50 Sq. Yd.', 'front': '13.92 M', 'rear': '8.26 M', 'depthR': '23.41 M', 'depthL': '21.33 M', 'gardenArea': '32.5 Sq. Yd.' } }),
  P(14, 377998, 572174, 830, { info: { 'area': '289.91 Sq. Yd.', 'front': '10.56 M', 'rear': '10.59 M', 'depthR': '22.51 M', 'depthL': '23.41 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(15, 388259, 573793, 830, { info: { 'area': '264.59 Sq. Yd.', 'front': '10.00 M', 'rear': '10.04 M', 'depthR': '22.03 M', 'depthL': '22.51 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(16, 398271, 574242, 830, { info: { 'area': '268.58 Sq. Yd.', 'front': '10.00 M', 'rear': '10.04 M', 'depthR': '22.88 M', 'depthL': '22.03 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(17, 408450, 570364, 830, { info: { 'area': '278.74 Sq. Yd.', 'front': '10.00 M', 'rear': '10.04 M', 'depthR': '23.73 M', 'depthL': '22.88 M', 'gardenArea': '59.76 Sq. Yd.' } }),
  P(18, 418417, 570586, 830, { info: { 'area': '288.89 Sq. Yd.', 'front': '10.00 M', 'rear': '10.04 M', 'depthR': '24.58 M', 'depthL': '23.73 M', 'gardenArea': '83.29 Sq. Yd.' } }),
  P(19, 428340, 571687, 830, { info: { 'area': '302.67 Sq. Yd.', 'front': '10.00 M', 'rear': '10.21 M', 'depthR': '26.47 M', 'depthL': '24.58 M', 'gardenArea': '41.03 Sq. Yd.' } }),
  P(20, 438218, 573791, 830, { info: { 'area': '291.55 Sq. Yd.', 'front': '10.00 M', 'rear': '11.35 M', 'depthR': '21.50 M', 'depthL': '26.47 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(21, 448086, 576955, 830, { info: { 'area': '221.51 Sq. Yd.', 'front': '10.00 M', 'rear': '11.58 M', 'depthR': '15.75 M', 'depthL': '21.50 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(22, 459024, 580216, 830, { info: { 'area': '220.50 Sq. Yd.', 'front': '11.91 M', 'rear': '11.93 M', 'depthR': '15.18 M', 'depthL': '15.75 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(23, 470939, 580852, 830, { info: { 'area': '221.96 Sq. Yd.', 'front': '11.90 M', 'rear': '11.92 M', 'depthR': '15.48 M', 'depthL': '15.18 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(24, 482816, 581202, 830, { info: { 'area': '219.33 Sq. Yd.', 'front': '11.90 M', 'rear': '11.93 M', 'depthR': '14.98 M', 'depthL': '15.48 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(25, 494002, 579595, 830, { info: { 'area': '244.81 Sq. Yd.', 'front': '10.27 M', 'rear': '9.99 M', 'depthR': '20.00 M', 'depthL': '20.01 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(26, 504130, 580026, 830, { info: { 'area': '239.20 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '20.00 M', 'depthL': '20.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(27, 515336, 580508, 830, { info: { 'area': '297.28 Sq. Yd.', 'front': '12.43 M', 'rear': '12.43 M', 'depthR': '20.00 M', 'depthL': '20.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(28, 506226, 559402, 830, { info: { 'area': '768.64 Sq. Yd.', 'front': '20.60 M', 'rear': '27.02 M', 'depthR': '32.42 M', 'depthL': '22.44 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(29, 540966, 564747, 830, { info: { 'area': '328.24 Sq. Yd.', 'front': '13.70 M', 'rear': '14.48 M', 'depthR': '20.00 M', 'depthL': '18.99 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(30, 535537, 581378, 830, { info: { 'area': '239.20 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '20.00 M', 'depthL': '20.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(31, 545808, 581838, 830, { info: { 'area': '256.10 Sq. Yd.', 'front': '11.41 M', 'rear': '10.00 M', 'depthR': '20.05 M', 'depthL': '20.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(32, 542409, 610218, 830, { info: { 'area': '297.48 Sq. Yd.', 'front': '13.00 M', 'rear': '13.03 M', 'depthR': '19.60 M', 'depthL': '18.68 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(33, 542332, 621724, 830, { info: { 'area': '238.60 Sq. Yd.', 'front': '10.00 M', 'rear': '10.02 M', 'depthR': '20.30 M', 'depthL': '19.60 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(34, 542255, 631733, 830, { info: { 'area': '247.04 Sq. Yd.', 'front': '10.00 M', 'rear': '10.03 M', 'depthR': '21.01 M', 'depthL': '20.30 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(35, 542061, 642947, 830, { info: { 'area': '279.65 Sq. Yd.', 'front': '12.99 M', 'rear': '6.16 M', 'depthR': '23.10 M', 'depthL': '21.01 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(36, 518689, 614193, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(37, 508696, 613763, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(38, 498702, 613332, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(39, 488709, 612902, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(40, 478715, 612472, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(41, 468721, 612042, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(42, 458728, 611612, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(43, 448734, 611181, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(44, 435066, 610717, 830, { info: { 'area': '398.44 Sq. Yd.', 'front': '11.55 M', 'rear': '17.42 M', 'depthR': '23.74 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(45, 517700, 637178, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(46, 507706, 636748, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(47, 497713, 636317, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(48, 487719, 635887, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(49, 477726, 635457, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(50, 467732, 635027, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(51, 457738, 634597, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(52, 447745, 634166, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(53, 438396, 633764, 830, { info: { 'area': '239.60 Sq. Yd.', 'front': '8.71 M', 'rear': '8.71 M', 'depthR': '23.00 M', 'depthL': '23.74 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(54, 426789, 633388, 830, { info: { 'area': '320.38 Sq. Yd.', 'front': '14.58 M', 'rear': '8.71 M', 'depthR': '23.00 M', 'depthL': '23.74 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(55, 380937, 700286, 830, { info: { 'area': '350.74 Sq. Yd.', 'front': '13.00 M', 'rear': '13.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(56, 384260, 689274, 830, { info: { 'area': '269.80 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(57, 387149, 679697, 830, { info: { 'area': '269.80 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(58, 390039, 670121, 830, { info: { 'area': '269.80 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(59, 392928, 660544, 830, { info: { 'area': '269.80 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(60, 395817, 650968, 830, { info: { 'area': '269.80 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(61, 398706, 641392, 830, { info: { 'area': '269.80 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(62, 401596, 631815, 830, { info: { 'area': '269.80 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(63, 404485, 622239, 830, { info: { 'area': '269.80 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(64, 407572, 612009, 830, { info: { 'area': '306.63 Sq. Yd.', 'front': '11.37 M', 'rear': '11.37 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(65, 385968, 605491, 830, { info: { 'area': '306.63 Sq. Yd.', 'front': '11.37 M', 'rear': '11.37 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(66, 382882, 615721, 830, { info: { 'area': '269.80 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(67, 379993, 625297, 830, { info: { 'area': '269.80 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(68, 377103, 634874, 830, { info: { 'area': '269.80 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(69, 374214, 644450, 830, { info: { 'area': '269.80 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(70, 371325, 654026, 830, { info: { 'area': '269.80 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(71, 368435, 663603, 830, { info: { 'area': '269.80 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(72, 365546, 673179, 830, { info: { 'area': '269.80 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(73, 362657, 682756, 830, { info: { 'area': '269.80 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(74, 359334, 693769, 830, { info: { 'area': '350.74 Sq. Yd.', 'front': '13.00 M', 'rear': '13.00 M', 'depthR': '22.56 M', 'depthL': '22.56 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(75, 332183, 693471, 830, { info: { 'area': '174.26 Sq. Yd.', 'front': '11.94 M', 'rear': '13.30 M', 'depthR': '14.80 M', 'depthL': '9.06 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(76, 333649, 682539, 830, { info: { 'area': '194.50 Sq. Yd.', 'front': '10.00 M', 'rear': '10.43 M', 'depthR': '17.75 M', 'depthL': '14.80 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(77, 333188, 672282, 830, { info: { 'area': '260.71 Sq. Yd.', 'front': '10.00 M', 'rear': '12.70 M', 'depthR': '22.38 M', 'depthL': '18.61 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(78, 335825, 662794, 830, { info: { 'area': '266.57 Sq. Yd.', 'front': '10.00 M', 'rear': '10.08 M', 'depthR': '21.72 M', 'depthL': '22.38 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(79, 339059, 653555, 830, { info: { 'area': '245.85 Sq. Yd.', 'front': '10.00 M', 'rear': '10.27 M', 'depthR': '19.39 M', 'depthL': '21.72 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(80, 343066, 644316, 830, { info: { 'area': '217.92 Sq. Yd.', 'front': '10.00 M', 'rear': '10.27 M', 'depthR': '17.05 M', 'depthL': '19.39 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(81, 352155, 624236, 830, { info: { 'area': '225.67 Sq. Yd.', 'front': '14.60 M', 'rear': '11.43 M', 'depthR': '19.03 M', 'depthL': '14.64 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(82, 349360, 595029, 830, { info: { 'area': '114.29 Sq. Yd.', 'front': '10.00 M', 'rear': '11.54 M', 'depthR': '12.44 M', 'depthL': '6.67 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(83, 338979, 594804, 830, { info: { 'area': '182.02 Sq. Yd.', 'front': '10.00 M', 'rear': '11.44 M', 'depthR': '18.00 M', 'depthL': '12.44 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(84, 329379, 593370, 830, { info: { 'area': '215.28 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '18.00 M', 'depthL': '18.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(85, 319803, 590481, 830, { info: { 'area': '215.28 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '18.00 M', 'depthL': '18.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(86, 310227, 587591, 830, { info: { 'area': '215.28 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '18.00 M', 'depthL': '18.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(87, 300650, 584702, 830, { info: { 'area': '215.28 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '18.00 M', 'depthL': '18.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(88, 291074, 581813, 830, { info: { 'area': '215.28 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '18.00 M', 'depthL': '18.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(89, 281497, 578923, 830, { info: { 'area': '215.28 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '18.00 M', 'depthL': '18.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(90, 271921, 576034, 830, { info: { 'area': '215.28 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '18.00 M', 'depthL': '18.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(91, 262345, 573145, 830, { info: { 'area': '215.28 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '18.00 M', 'depthL': '18.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(92, 251332, 569822, 830, { info: { 'area': '279.86 Sq. Yd.', 'front': '13.00 M', 'rear': '13.00 M', 'depthR': '18.00 M', 'depthL': '18.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(93, 323456, 613002, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(94, 313880, 610112, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(95, 304303, 607223, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(96, 294727, 604334, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(97, 285151, 601444, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(98, 275574, 598555, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(99, 265998, 595666, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(100, 256421, 592776, 830, { info: { 'area': '275.08 Sq. Yd.', 'front': '10.00 M', 'rear': '10.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(101, 245409, 589454, 830, { info: { 'area': '357.60 Sq. Yd.', 'front': '13.00 M', 'rear': '13.00 M', 'depthR': '23.00 M', 'depthL': '23.00 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(102, 235032, 616925, 830, { info: { 'area': '190.45 Sq. Yd.', 'front': '9.05 M', 'rear': '9.05 M', 'depthR': '17.69 M', 'depthL': '17.52 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(103, 212585, 615377, 830, { info: { 'area': '161.30 Sq. Yd.', 'front': '7.90 M', 'rear': '7.68 M', 'depthR': '17.99 M', 'depthL': '16.83 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(104, 214569, 606580, 830, { info: { 'area': '224.32 Sq. Yd.', 'front': '10.00 M', 'rear': '10.12 M', 'depthR': '19.52 M', 'depthL': '17.99 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(105, 216723, 596782, 830, { info: { 'area': '242.68 Sq. Yd.', 'front': '10.00 M', 'rear': '10.12 M', 'depthR': '21.06 M', 'depthL': '19.52 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(106, 218877, 586985, 830, { info: { 'area': '261.04 Sq. Yd.', 'front': '10.00 M', 'rear': '10.12 M', 'depthR': '22.58 M', 'depthL': '21.06 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(107, 221038, 577205, 830, { info: { 'area': '278.50 Sq. Yd.', 'front': '10.00 M', 'rear': '10.10 M', 'depthR': '23.99 M', 'depthL': '22.58 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(108, 223254, 567426, 830, { info: { 'area': '295.31 Sq. Yd.', 'front': '10.00 M', 'rear': '10.10 M', 'depthR': '25.40 M', 'depthL': '23.90 M', 'gardenArea': '0 Sq. Yd.' } }),
  P(109, 225470, 557646, 830, { info: { 'area': '312.13 Sq. Yd.', 'front': '10.00 M', 'rear': '10.10 M', 'depthR': '26.80 M', 'depthL': '25.40 M', 'gardenArea': '0 Sq. Yd.' } }),
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
