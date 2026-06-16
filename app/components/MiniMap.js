'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { sceneAdjacency } from '../data/scenes';
import { plots } from '../data/plots';
import {
  SITE_MAP,
  MAP_WORLD_WIDTH_MM,
  MAP_WORLD_HEIGHT_MM,
  cameraRawToMapFraction,
} from '../data/geo';
import SiteMapOverlay from './SiteMapOverlay';
import styles from '../styles/MiniMap.module.css';

// The radar shows a region this wide (mm of real world) around the current
// scene — game-minimap style. Click the radar for the full site map.
const REGION_WORLD_MM = 220000;

export default function MiniMap({ scenes, currentScene, currentSceneId, onSceneSelect, cameraYawRef, adjacentScenes, onPlotSelect }) {
  const coneRef = useRef(null);
  const coneAngleRef = useRef(0);
  const [expanded, setExpanded] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Scene dots georeferenced onto the site map (fractions of the map image).
  // Everything on the map — image, scene dots, plot pins — shares the single
  // world→map transform in data/geo.js, so they can never disagree.
  const positions = useMemo(
    () =>
      scenes
        .filter((s) => s.type === 'ground')
        .map((scene) => {
          const { u, v } = cameraRawToMapFraction(scene.rawPosition);
          return { id: scene.id, name: scene.name, u, v };
        }),
    [scenes]
  );

  const plotPins = useMemo(
    () => plots.filter((p) => p.map).map((p) => ({ id: p.id, name: p.name, u: p.map.u, v: p.map.v, plot: p })),
    []
  );

  // Region window: the full map is rendered as one large layer positioned so
  // the current scene sits at the radar's centre. All sizes are % of the
  // (square) radar, so no pixel measurement is needed; CSS transitions the
  // layer smoothly when you walk to another scene.
  const layer = useMemo(() => {
    const w = (MAP_WORLD_WIDTH_MM / REGION_WORLD_MM) * 100;
    const h = (MAP_WORLD_HEIGHT_MM / REGION_WORLD_MM) * 100;
    const cur = positions.find((p) => p.id === currentSceneId);
    const u = cur?.u ?? 0.5;
    const v = cur?.v ?? 0.5;
    return { w, h, left: 50 - u * w, top: 50 - v * h };
  }, [positions, currentSceneId]);

  useEffect(() => {
    // Reset drag offset when scene changes to recenter
    x.set(0);
    y.set(0);
  }, [currentSceneId, x, y]);

  // Rotate the cone to show where the camera is actually facing — SELF-CALIBRATED
  // from the scene's own hotspots (which the user placed and trusts), NOT from the
  // often-uncalibrated yawOffset.
  useEffect(() => {
    let sumSin = 0;
    let sumCos = 0;
    let calibrated = false;
    if (currentScene?.rawPosition && adjacentScenes) {
      for (const adj of adjacentScenes) {
        if (adj.yaw === undefined || !adj.targetScene?.rawPosition) continue;
        const dx = adj.targetScene.rawPosition[0] - currentScene.rawPosition[0];
        const dy = adj.targetScene.rawPosition[1] - currentScene.rawPosition[1];
        const w = Math.atan2(-dx, -dy); // CSV-frame bearing of this hotspot
        const c = (3 * Math.PI) / 2 - w + adj.yaw;
        sumSin += Math.sin(c);
        sumCos += Math.cos(c);
        calibrated = true;
      }
    }
    const C = calibrated
      ? Math.atan2(sumSin, sumCos)
      : (3 * Math.PI) / 2 - (currentScene?.yawOffset ?? 0);

    let raf;
    const tick = () => {
      const cone = coneRef.current;
      if (cone && cameraYawRef) {
        const targetMapAngle = (-cameraYawRef.current + C) * (180 / Math.PI);

        // Shortest-arc lerp so the cone never spins the long way round
        let diff = targetMapAngle - coneAngleRef.current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        coneAngleRef.current += diff * 0.2;
        cone.style.transform = `translate(-50%, -50%) rotate(${coneAngleRef.current}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [currentSceneId, currentScene, cameraYawRef, adjacentScenes]);

  return (
    <>
      <motion.div
        className={styles.container}
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: 'easeOut' }}
      >
        {/* Clicking the radar (anywhere that isn't a scene dot) opens the full map */}
        <div
          className={styles.mapArea}
          onClick={() => setExpanded(true)}
          title="Open site map"
        >
          <motion.div
            className={styles.regionLayer}
            style={{
              width: `${layer.w}%`,
              height: `${layer.h}%`,
              left: `${layer.left}%`,
              top: `${layer.top}%`,
              x,
              y
            }}
            drag
            dragMomentum={true}
            dragElastic={0.1}
          >
            <img src={SITE_MAP.url} alt="" className={styles.regionImage} draggable={false} />

            {/* Connection lines */}
            <svg className={styles.connections} viewBox="0 0 100 100" preserveAspectRatio="none">
              {positions.map((pos) => {
                const adjIds = sceneAdjacency[pos.id]?.map((a) => a.id) || [];
                return adjIds.map((targetId) => {
                  const targetPos = positions.find((p) => p.id === targetId);
                  if (!targetPos) return null;
                  return (
                    <line
                      key={`${pos.id}-${targetId}`}
                      x1={pos.u * 100}
                      y1={pos.v * 100}
                      x2={targetPos.u * 100}
                      y2={targetPos.v * 100}
                      stroke="rgba(15,77,41,0.35)"
                      strokeWidth="1.2"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                });
              })}
            </svg>

            {/* Plot pins */}
            {plotPins.map((p) => (
              <button
                key={p.id}
                className={styles.plotMicroPinHit}
                style={{ left: `${p.u * 100}%`, top: `${p.v * 100}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onPlotSelect) onPlotSelect(p.plot);
                }}
                title={p.name}
              >
                <span className={styles.plotMicroPin} />
              </button>
            ))}

            {/* Scene dots — large transparent hit areas around small visual dots */}
            {positions.map((pos) => {
              const isActive = pos.id === currentSceneId;
              return (
                <button
                  key={pos.id}
                  className={`${styles.dotHit} ${isActive ? styles.dotHitActive : ''}`}
                  style={{ left: `${pos.u * 100}%`, top: `${pos.v * 100}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSceneSelect(pos.id);
                  }}
                  title={pos.name}
                >
                  {/* Facing cone — only on the current location */}
                  {isActive && (
                    <svg ref={coneRef} className={styles.cone} viewBox="0 0 46 46" aria-hidden="true">
                      <defs>
                        <radialGradient id="coneGrad" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="rgba(31,122,60,0.62)" />
                          <stop offset="100%" stopColor="rgba(31,122,60,0)" />
                        </radialGradient>
                      </defs>
                      <path d="M23,23 L11,4 A22,22 0 0,1 35,4 Z" fill="url(#coneGrad)" />
                    </svg>
                  )}

                  <span className={`${styles.dot} ${isActive ? styles.dotActive : ''}`}>
                    {isActive && <span className={styles.dotPulse} />}
                  </span>
                </button>
              );
            })}
          </motion.div>

          {/* Expand affordance (also the keyboard path into the full map) */}
          <button
            className={styles.expandButton}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
            aria-label="Open full site map"
            title="Open full site map"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
        </div>
      </motion.div>

      <SiteMapOverlay
        open={expanded}
        onClose={() => setExpanded(false)}
        scenePoints={positions}
        currentSceneId={currentSceneId}
        onSceneSelect={(id) => {
          setExpanded(false);
          onSceneSelect(id);
        }}
        onPlotSelect={onPlotSelect}
      />
    </>
  );
}
