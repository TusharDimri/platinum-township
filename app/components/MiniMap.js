'use client';

import { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneAdjacency } from '../data/scenes';
import styles from '../styles/MiniMap.module.css';

export default function MiniMap({ scenes, currentScene, currentSceneId, onSceneSelect, cameraYawRef, adjacentScenes }) {
  const coneRef = useRef(null);
  const coneAngleRef = useRef(0);

  // Calculate bounds for mapping positions to 2D
  const { positions } = useMemo(() => {
    const groundScenes = scenes.filter(s => s.type === 'ground');
    const xs = groundScenes.map((s) => s.position[0]);
    const zs = groundScenes.map((s) => s.position[2]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const padding = 20; // percentage padding

    const rangeX = maxX - minX || 1;
    const rangeZ = maxZ - minZ || 1;

    const positions = groundScenes.map((scene) => ({
      id: scene.id,
      name: scene.name,
      x: ((scene.position[0] - minX) / rangeX) * (100 - padding * 2) + padding,
      y: ((scene.position[2] - minZ) / rangeZ) * (100 - padding * 2) + padding,
    }));

    return { positions };
  }, [scenes]);

  // Rotate the cone to show where the camera is actually facing — SELF-CALIBRATED
  // from the scene's own hotspots (which the user placed and trusts), NOT from the
  // often-uncalibrated yawOffset.
  //
  // The cone maps camera euler.y to an on-map bearing linearly with slope -1
  // (a panorama is a rigid rotation of the world): coneAngle = -euler.y + C.
  // Each hotspot gives one calibration sample, because we know both:
  //   • the euler.y that faces it           → adj.yaw
  //   • the on-map bearing to its dot       → atan2(dx, -dy)   (CW from up)
  // so C = mapAngle + adj.yaw. We circular-average C over every hotspot, which is
  // robust to slight misplacement and needs no yawOffset at all. Result: look at a
  // path and the cone points straight at that path's destination on the map.
  useEffect(() => {
    const currentPos = positions.find(p => p.id === currentSceneId);

    let sumSin = 0;
    let sumCos = 0;
    let calibrated = false;
    if (currentPos && adjacentScenes) {
      for (const adj of adjacentScenes) {
        if (adj.yaw === undefined) continue;
        const targetPos = positions.find(p => p.id === adj.targetScene.id);
        if (!targetPos) continue;
        const dx = targetPos.x - currentPos.x;
        const dy = targetPos.y - currentPos.y;
        const c = Math.atan2(dx, -dy) + adj.yaw; // calibration constant (radians)
        sumSin += Math.sin(c);
        sumCos += Math.cos(c);
        calibrated = true;
      }
    }
    // Fallback to the yawOffset model only for scenes with no usable hotspots.
    const C = calibrated ? Math.atan2(sumSin, sumCos) : -(currentScene?.yawOffset ?? 0);

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
  }, [currentSceneId, positions, cameraYawRef, adjacentScenes, currentScene]);

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5, ease: 'easeOut' }}
    >
      <div className={styles.header}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>Map</span>
      </div>

      <div className={styles.mapArea}>
        {/* Connection lines */}
        <svg className={styles.connections} viewBox="0 0 100 100" preserveAspectRatio="none">
          {positions.map((pos) => {
            const adjIds = sceneAdjacency[pos.id]?.map(a => a.id) || [];
            return adjIds.map((targetId) => {
              const targetPos = positions.find(p => p.id === targetId);
              if (targetPos) {
                return (
                  <line
                    key={`${pos.id}-${targetId}`}
                    x1={`${pos.x}%`}
                    y1={`${pos.y}%`}
                    x2={`${targetPos.x}%`}
                    y2={`${targetPos.y}%`}
                    stroke="rgba(86,98,74,0.28)"
                    strokeWidth="0.5"
                  />
                );
              }
              return null;
            });
          })}
        </svg>

        {/* Scene dots — large transparent hit areas around small visual dots */}
        {positions.map((pos) => {
          const isActive = pos.id === currentSceneId;
          return (
            <button
              key={pos.id}
              className={`${styles.dotHit} ${isActive ? styles.dotHitActive : ''}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onClick={() => onSceneSelect(pos.id)}
              title={pos.name}
            >
              {/* Facing cone — only on the current location */}
              {isActive && (
                <svg
                  ref={coneRef}
                  className={styles.cone}
                  viewBox="0 0 46 46"
                  aria-hidden="true"
                >
                  <defs>
                    <radialGradient id="coneGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(110,123,90,0.6)" />
                      <stop offset="100%" stopColor="rgba(110,123,90,0)" />
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
      </div>
    </motion.div>
  );
}
