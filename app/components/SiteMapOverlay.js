'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { sceneAdjacency } from '../data/scenes';
import { plots } from '../data/plots';
import { SITE_MAP } from '../data/geo';
import PlotInfoPanel from './PlotInfoPanel';
import styles from '../styles/SiteMapOverlay.module.css';

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const DRAG_THRESHOLD_PX = 5;

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
export default function SiteMapOverlay({ open, onClose, scenePoints, currentSceneId, onSceneSelect }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedPlot, setSelectedPlot] = useState(null);

  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const dragJustEndedRef = useRef(false);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const selectedRef = useRef(selectedPlot);
  zoomRef.current = zoom;
  panRef.current = pan;
  selectedRef.current = selectedPlot;

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

  // Fresh view every time the map opens
  useEffect(() => {
    if (open) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setSelectedPlot(null);
    }
  }, [open]);

  // Escape, capture phase: if a plot panel is open let ITS handler close it;
  // otherwise close the map — and stop the event so the tour's Escape→home
  // binding never fires underneath.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (selectedRef.current) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [open, onClose]);

  const clampPan = (p, z, vp) => {
    const limX = ((z - 1) * vp.width) / 2 + 80;
    const limY = ((z - 1) * vp.height) / 2 + 80;
    return {
      x: Math.min(limX, Math.max(-limX, p.x)),
      y: Math.min(limY, Math.max(-limY, p.y)),
    };
  };

  const zoomAround = (factor, clientX, clientY) => {
    const el = viewportRef.current;
    if (!el) return;
    const vp = el.getBoundingClientRect();
    const cx = vp.left + vp.width / 2;
    const cy = vp.top + vp.height / 2;
    const z = zoomRef.current;
    const p = panRef.current;
    const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor));
    if (nz === z) return;
    // Keep the point under (clientX, clientY) stationary while scaling.
    const ax = (clientX - cx - p.x) / z;
    const ay = (clientY - cy - p.y) / z;
    setZoom(nz);
    setPan(clampPan({ x: clientX - cx - ax * nz, y: clientY - cy - ay * nz }, nz, vp));
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

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    dragRef.current = {
      sx: e.clientX,
      sy: e.clientY,
      px: panRef.current.x,
      py: panRef.current.y,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD_PX) d.moved = true;
    if (!d.moved) return;
    const vp = viewportRef.current.getBoundingClientRect();
    setPan(clampPan({ x: d.px + dx, y: d.py + dy }, zoomRef.current, vp));
  };

  const onPointerUp = () => {
    dragJustEndedRef.current = !!dragRef.current?.moved;
    dragRef.current = null;
  };

  // After a drag, swallow the click that follows so pins/backdrop don't react.
  const onClickCapture = (e) => {
    if (dragJustEndedRef.current) {
      dragJustEndedRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const counterScale = { transform: `translate(-50%, -50%) scale(${1 / zoom})` };

  return (
    <div
      ref={viewportRef}
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Site map"
      onClick={onClose}
      onClickCapture={onClickCapture}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* The pannable/zoomable stage */}
      <div
        className={styles.stage}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={styles.mapBox}
          style={{ width: `min(92vw, calc(84vh * ${aspect}))`, aspectRatio: `${SITE_MAP.imageWidth} / ${SITE_MAP.imageHeight}` }}
        >
          <img src={SITE_MAP.url} alt="Township site plan" className={styles.mapImage} draggable={false} />

          {/* Walk connections between scenes */}
          <svg className={styles.connections} viewBox="0 0 100 100" preserveAspectRatio="none">
            {scenePoints.map((pos) => {
              const adjIds = sceneAdjacency[pos.id]?.map((a) => a.id) || [];
              return adjIds.map((targetId) => {
                const t = scenePoints.find((p) => p.id === targetId);
                if (!t) return null;
                return (
                  <line
                    key={`${pos.id}-${targetId}`}
                    x1={pos.u * 100}
                    y1={pos.v * 100}
                    x2={t.u * 100}
                    y2={t.v * 100}
                    stroke="rgba(15,77,41,0.4)"
                    strokeWidth="1.4"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              });
            })}
          </svg>

          {/* Plot pins */}
          {pins.map(({ plot, u, v, statusClass }) => (
            <button
              key={plot.id}
              className={`${styles.pin} ${styles[statusClass]} ${selectedPlot?.id === plot.id ? styles.pinSelected : ''}`}
              style={{ left: `${u * 100}%`, top: `${v * 100}%`, ...counterScale }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPlot((cur) => (cur?.id === plot.id ? null : plot));
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
      </div>

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
            setPan({ x: 0, y: 0 });
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

      {/* Plot details card (shared with the 3D tags) */}
      <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <PlotInfoPanel plot={selectedPlot} onClose={() => setSelectedPlot(null)} />
      </div>
    </div>
  );
}
