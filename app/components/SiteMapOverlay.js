'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { sceneAdjacency } from '../data/scenes';
import { plots } from '../data/plots';
import { SITE_MAP } from '../data/geo';
import styles from '../styles/SiteMapOverlay.module.css';

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

const STATUS_CLASS = {
  available: 'pinAvailable',
  reserved: 'pinReserved',
  sold: 'pinSold',
};

/**
 * Full-screen site map (game-style): the georeferenced plan with every plot
 * pin and scene dot on it. Wheel/buttons zoom (toward the cursor), drag pans,
 * plot pins open the info panel, scene dots walk you there. Escape closes the
 * plot panel first, then the map — never the tour.
 */
export default function SiteMapOverlay({ open, onClose, scenePoints, currentSceneId, onSceneSelect, onPlotSelect, plotOpen }) {
  const [zoom, setZoom] = useState(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const viewportRef = useRef(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const aspect = SITE_MAP.imageWidth / SITE_MAP.imageHeight;

  const pins = useMemo(
    () =>
      plots
        .filter((p) => p.map)
        .map((p) => ({
          plot: p,
          u: p.map.u,
          v: p.map.v,
          statusClass: STATUS_CLASS[(p.info?.status || 'available').toLowerCase()] || STATUS_CLASS.available,
        })),
    []
  );

  // Walk-graph edges → line endpoints. Depends only on scene geometry, so it's
  // computed once instead of rebuilt on every pan/zoom render.
  const connectionLines = useMemo(() => {
    const byId = new Map(scenePoints.map((p) => [p.id, p]));
    const lines = [];
    for (const pos of scenePoints) {
      for (const a of sceneAdjacency[pos.id] || []) {
        const t = byId.get(a.id);
        if (t) lines.push({ key: `${pos.id}-${a.id}`, x1: pos.u * 100, y1: pos.v * 100, x2: t.u * 100, y2: t.v * 100 });
      }
    }
    return lines;
  }, [scenePoints]);

  // Fresh view every time the map opens
  useEffect(() => {
    if (open) {
      setZoom(1);
      x.set(0);
      y.set(0);
    }
  }, [open, x, y]);

  // Escape to close map — but if a plot panel is layered on top, let it handle
  // Escape first (close the plot, keep the map open). We bail without stopping
  // propagation so PlotInfoPanel's own capture-phase handler still fires.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape' || plotOpen) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [open, onClose, plotOpen]);

  const zoomAround = (factor, clientX, clientY) => {
    const el = viewportRef.current;
    if (!el) return;
    const vp = el.getBoundingClientRect();
    const cx = vp.left + vp.width / 2;
    const cy = vp.top + vp.height / 2;
    const z = zoomRef.current;
    const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor));
    if (nz === z) return;
    
    // Keep the point under (clientX, clientY) stationary while scaling.
    const ax = (clientX - cx - x.get()) / z;
    const ay = (clientY - cy - y.get()) / z;
    setZoom(nz);
    x.set(clientX - cx - ax * nz);
    y.set(clientY - cy - ay * nz);
  };

  // Native wheel listener: must be non-passive to preventDefault page scroll.
  useEffect(() => {
    if (!open) return;
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      zoomAround(Math.exp(-e.deltaY * 0.0014), e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [open]);

  if (!open) return null;

  const counterScale = { transform: `translate(-50%, -50%) scale(${1 / zoom})` };

  return (
    <div
      ref={viewportRef}
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Site map"
      onClick={onClose}
    >
      {/* The pannable/zoomable stage */}
      <motion.div
        className={styles.stage}
        style={{ x, y, scale: zoom }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={styles.mapBox}
          style={{ width: `min(92vw, calc(84vh * ${aspect}))`, aspectRatio: `${SITE_MAP.imageWidth} / ${SITE_MAP.imageHeight}` }}
        >
          <img src={SITE_MAP.url} alt="Township site plan" className={styles.mapImage} draggable={false} />

          {/* Walk connections between scenes */}
          <svg className={styles.connections} viewBox="0 0 100 100" preserveAspectRatio="none">
            {connectionLines.map((l) => (
              <line
                key={l.key}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="rgba(15,77,41,0.4)"
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* Plot pins */}
          {pins.map(({ plot, u, v, statusClass }) => (
            <button
              key={plot.id}
              className={`${styles.pin} ${styles[statusClass]}`}
              style={{ left: `${u * 100}%`, top: `${v * 100}%`, ...counterScale }}
              onClick={(e) => {
                e.stopPropagation();
                // Keep the map open underneath — the plot panel layers on top so
                // the visitor can close it and pick another plot from the map.
                onPlotSelect(plot);
              }}
              aria-label={`${plot.name} details`}
            >
              <span className={styles.pinDot} />
              <span className={styles.pinLabel}>{plot.name}</span>
            </button>
          ))}

          {/* Scene dots — click to walk there */}
          {scenePoints.map((pos) => {
            const isActive = pos.id === currentSceneId;
            return (
              <button
                key={pos.id}
                className={`${styles.sceneDot} ${isActive ? styles.sceneDotActive : ''}`}
                style={{ left: `${pos.u * 100}%`, top: `${pos.v * 100}%`, ...counterScale }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isActive) onSceneSelect(pos.id);
                }}
                aria-label={isActive ? `${pos.name} (you are here)` : `Walk to ${pos.name}`}
              >
                <span className={styles.sceneDotInner}>{isActive && <span className={styles.sceneDotPulse} />}</span>
                <span className={styles.sceneLabel}>{isActive ? `${pos.name} — you are here` : pos.name}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Chrome — stop pointer/clicks from reaching the pan surface */}
      <header className={styles.topBar} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <span className={styles.title}>Site Map</span>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close site map">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className={styles.zoomControls} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <button
          onClick={() => {
            const vp = viewportRef.current.getBoundingClientRect();
            zoomAround(1.4, vp.left + vp.width / 2, vp.top + vp.height / 2);
          }}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => {
            const vp = viewportRef.current.getBoundingClientRect();
            zoomAround(1 / 1.4, vp.left + vp.width / 2, vp.top + vp.height / 2);
          }}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={() => {
            setZoom(1);
            x.set(0);
            y.set(0);
          }}
          aria-label="Reset view"
        >
          ⟳
        </button>
      </div>

      <footer className={styles.legend} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <span className={styles.legendItem}>
          <i className={`${styles.legendSwatch} ${styles.swatchAvailable}`} /> Available
        </span>
        <span className={styles.legendItem}>
          <i className={`${styles.legendSwatch} ${styles.swatchReserved}`} /> Reserved
        </span>
        <span className={styles.legendItem}>
          <i className={`${styles.legendSwatch} ${styles.swatchSold}`} /> Sold
        </span>
        <span className={styles.legendItem}>
          <i className={`${styles.legendSwatch} ${styles.swatchScene}`} /> Walk point
        </span>
      </footer>
    </div>
  );
}
